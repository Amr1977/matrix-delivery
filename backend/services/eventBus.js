const EventEmitter = require('events');
const pool = require('../config/db');

/**
 * Centralized Event Bus for domain events
 *
 * Features:
 * - Domain event emission and subscription
 * - At-least-once delivery semantics
 * - Async event processing
 * - Event replay capabilities
 * - Event persistence for audit trail
 * - Dead letter queue for failed deliveries
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.subscriptions = new Map();
    this.processingQueue = [];
    this.isProcessing = false;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Subscribe to domain events
   * @param {string} eventType - The event type to subscribe to
   * @param {function} handler - The event handler function
   * @param {object} options - Subscription options
   */
  subscribe(eventType, handler, options = {}) {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const subscription = {
      handler,
      options: {
        async: options.async !== false, // Default to async processing
        retry: options.retry !== false, // Default to retry on failure
        ...options
      }
    };

    this.subscriptions.get(eventType).push(subscription);

    console.log(`Subscribed to event: ${eventType}`);
  }

  /**
   * Unsubscribe from domain events
   * @param {string} eventType - The event type to unsubscribe from
   * @param {function} handler - The handler to remove (optional)
   */
  unsubscribe(eventType, handler = null) {
    if (!this.subscriptions.has(eventType)) {
      return;
    }

    if (handler) {
      const subscriptions = this.subscriptions.get(eventType);
      const filtered = subscriptions.filter(sub => sub.handler !== handler);
      if (filtered.length === 0) {
        this.subscriptions.delete(eventType);
      } else {
        this.subscriptions.set(eventType, filtered);
      }
    } else {
      this.subscriptions.delete(eventType);
    }

    console.log(`Unsubscribed from event: ${eventType}`);
  }

  /**
   * Emit a domain event
   * @param {string} eventType - The event type
   * @param {object} payload - The event payload
   * @param {object} options - Emission options
   */
  async emit(eventType, payload, options = {}) {
    const event = {
      id: this.generateEventId(),
      type: eventType,
      payload: {
        ...payload,
        timestamp: payload.timestamp || new Date(),
        eventId: payload.eventId || this.generateEventId()
      },
      metadata: {
        emittedAt: new Date(),
        source: options.source || 'unknown',
        correlationId: options.correlationId || payload.correlationId,
        version: options.version || '1.0'
      },
      delivery: {
        attempts: 0,
        maxRetries: this.maxRetries,
        status: 'pending'
      }
    };

    try {
      // Persist event to database
      await this.persistEvent(event);

      // Add to processing queue
      this.processingQueue.push(event);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }

      // Emit locally for immediate subscribers
      super.emit(eventType, event.payload);

      console.log(`Event emitted: ${eventType} (${event.id})`);

    } catch (error) {
      console.error(`Failed to emit event ${eventType}:`, error);
      await this.handleEventFailure(event, error);
    }
  }

  /**
   * Process the event queue
   */
  async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const event = this.processingQueue.shift();

      try {
        await this.deliverEvent(event);
        await this.markEventDelivered(event);
        console.log(`Event delivered: ${event.type} (${event.id})`);
      } catch (error) {
        console.error(`Event delivery failed: ${event.type} (${event.id})`, error);
        await this.handleDeliveryFailure(event, error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Deliver event to all subscribers
   */
  async deliverEvent(event) {
    const subscriptions = this.subscriptions.get(event.type) || [];

    if (subscriptions.length === 0) {
      console.warn(`No subscribers for event: ${event.type}`);
      return;
    }

    const deliveryPromises = subscriptions.map(async (subscription) => {
      try {
        if (subscription.options.async) {
          // Async processing - don't wait for completion
          setImmediate(() => {
            subscription.handler(event.payload, event.metadata);
          });
        } else {
          // Sync processing - wait for completion
          await subscription.handler(event.payload, event.metadata);
        }
      } catch (error) {
        console.error(`Subscriber error for ${event.type}:`, error);
        if (subscription.options.retry) {
          throw error; // Re-throw to trigger retry logic
        }
      }
    });

    // Wait for all deliveries (or failures)
    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Handle delivery failure with retry logic
   */
  async handleDeliveryFailure(event, error) {
    event.delivery.attempts++;

    if (event.delivery.attempts < event.delivery.maxRetries) {
      // Schedule retry
      console.log(`Retrying event delivery: ${event.type} (${event.id}) - attempt ${event.delivery.attempts}`);

      setTimeout(() => {
        this.processingQueue.unshift(event); // Add to front of queue
        this.processQueue();
      }, this.retryDelay * event.delivery.attempts);

    } else {
      // Max retries exceeded - move to dead letter queue
      console.error(`Max retries exceeded for event: ${event.type} (${event.id})`);
      await this.moveToDeadLetterQueue(event, error);
    }
  }

  /**
   * Persist event to database for audit trail and replay
   */
  async persistEvent(event) {
    await pool.query(`
      INSERT INTO domain_events (
        event_id, event_type, payload, metadata, delivery_status, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      event.id,
      event.type,
      JSON.stringify(event.payload),
      JSON.stringify(event.metadata),
      event.delivery.status
    ]);
  }

  /**
   * Mark event as delivered in database
   */
  async markEventDelivered(event) {
    await pool.query(`
      UPDATE domain_events
      SET delivery_status = 'delivered',
          delivered_at = NOW(),
          delivery_attempts = $1
      WHERE event_id = $2
    `, [event.delivery.attempts, event.id]);
  }

  /**
   * Move failed event to dead letter queue
   */
  async moveToDeadLetterQueue(event, error) {
    await pool.query(`
      INSERT INTO dead_letter_queue (
        event_id, event_type, payload, metadata, error_message, failed_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      event.id,
      event.type,
      JSON.stringify(event.payload),
      JSON.stringify(event.metadata),
      error.message
    ]);

    // Update original event status
    await pool.query(`
      UPDATE domain_events
      SET delivery_status = 'dead_letter',
          delivery_attempts = $1,
          last_error = $2,
          updated_at = NOW()
      WHERE event_id = $3
    `, [event.delivery.attempts, error.message, event.id]);
  }

  /**
   * Replay events from a specific point in time
   * @param {Date} fromTimestamp - Replay events from this timestamp
   * @param {string[]} eventTypes - Specific event types to replay (optional)
   */
  async replayEvents(fromTimestamp, eventTypes = null) {
    let query = `
      SELECT event_id, event_type, payload, metadata
      FROM domain_events
      WHERE created_at >= $1
      AND delivery_status = 'delivered'
    `;
    const params = [fromTimestamp];

    if (eventTypes && eventTypes.length > 0) {
      query += ` AND event_type = ANY($2)`;
      params.push(eventTypes);
    }

    query += ` ORDER BY created_at ASC`;

    const result = await pool.query(query, params);

    console.log(`Replaying ${result.rows.length} events from ${fromTimestamp}`);

    for (const row of result.rows) {
      try {
        const payload = JSON.parse(row.payload);
        const metadata = JSON.parse(row.metadata);

        // Re-emit event for replay
        super.emit(row.event_type, payload);

        console.log(`Replayed event: ${row.event_type} (${row.event_id})`);
      } catch (error) {
        console.error(`Failed to replay event ${row.event_id}:`, error);
      }
    }
  }

  /**
   * Get event statistics
   */
  async getEventStats() {
    const result = await pool.query(`
      SELECT
        event_type,
        COUNT(*) as total_events,
        COUNT(CASE WHEN delivery_status = 'delivered' THEN 1 END) as delivered_events,
        COUNT(CASE WHEN delivery_status = 'dead_letter' THEN 1 END) as failed_events,
        AVG(delivery_attempts) as avg_delivery_attempts
      FROM domain_events
      GROUP BY event_type
      ORDER BY total_events DESC
    `);

    return result.rows;
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old events (for maintenance)
   * @param {number} daysOld - Remove events older than this many days
   */
  async cleanupOldEvents(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await pool.query(`
      DELETE FROM domain_events
      WHERE created_at < $1
      AND delivery_status = 'delivered'
    `, [cutoffDate]);

    console.log(`Cleaned up ${result.rowCount} old events`);
    return result.rowCount;
  }

  /**
   * Get undelivered events for manual retry
   */
  async getUndeliveredEvents(limit = 100) {
    const result = await pool.query(`
      SELECT event_id, event_type, payload, metadata, delivery_attempts
      FROM domain_events
      WHERE delivery_status != 'delivered'
      ORDER BY created_at ASC
      LIMIT $1
    `, [limit]);

    return result.rows.map(row => ({
      ...row,
      payload: JSON.parse(row.payload),
      metadata: JSON.parse(row.metadata)
    }));
  }

  /**
   * Manually retry undelivered events
   */
  async retryUndeliveredEvents() {
    const undeliveredEvents = await this.getUndeliveredEvents();

    for (const eventData of undeliveredEvents) {
      const event = {
        id: eventData.event_id,
        type: eventData.event_type,
        payload: eventData.payload,
        metadata: eventData.metadata,
        delivery: {
          attempts: eventData.delivery_attempts,
          maxRetries: this.maxRetries,
          status: 'retrying'
        }
      };

      this.processingQueue.push(event);
    }

    if (undeliveredEvents.length > 0) {
      console.log(`Retrying ${undeliveredEvents.length} undelivered events`);
      this.processQueue();
    }
  }
}

// Export singleton instance
const eventBus = new EventBus();

module.exports = {
  EventBus,
  eventBus
};
