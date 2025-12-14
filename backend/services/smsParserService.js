const logger = require('../utils/logger');

/**
 * SMS Parser Service
 * Parses incoming SMS from wallet providers to extract payment details
 * Supports: Vodafone Cash, InstaPay, Orange Cash, Etisalat Cash
 */
class SMSParserService {
    /**
     * Parse Vodafone Cash SMS
     * Example: "You have received 150.00 EGP from 01234567890. Ref: VF123456789. Date: 13/12/2025 23:30"
     */
    parseVodafoneCash(smsContent) {
        try {
            const patterns = {
                // Pattern 1: "You have received X EGP from PHONE"
                received: /(?:received|استلمت)\s+(\d+\.?\d*)\s*(?:EGP|جنيه|ج\.م)/i,
                sender: /from\s+(\d{11})/i,
                reference: /(?:Ref|Reference|مرجع)[:\s]+([A-Z0-9]+)/i,
                date: /(?:Date|التاريخ)[:\s]+(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2})/i
            };

            const amount = smsContent.match(patterns.received)?.[1];
            const senderPhone = smsContent.match(patterns.sender)?.[1];
            const reference = smsContent.match(patterns.reference)?.[1];
            const dateStr = smsContent.match(patterns.date)?.[1];

            if (!amount || !senderPhone) {
                return null;
            }

            return {
                walletType: 'vodafone_cash',
                amount: parseFloat(amount),
                senderPhone: senderPhone,
                transactionReference: reference || null,
                transferTimestamp: dateStr ? this.parseDateTime(dateStr) : new Date(),
                rawSMS: smsContent
            };
        } catch (error) {
            logger.error('Error parsing Vodafone Cash SMS', { error: error.message });
            return null;
        }
    }

    /**
     * Parse InstaPay SMS
     * Example: "InstaPay: Received 200 EGP from sender@instapay. Ref: IP987654321. 13/12/2025 23:30"
     */
    parseInstaPay(smsContent) {
        try {
            const patterns = {
                received: /(?:received|استلمت)\s+(\d+\.?\d*)\s*(?:EGP|جنيه)/i,
                sender: /from\s+([\w.@]+)/i,
                reference: /(?:Ref|Reference)[:\s]+([A-Z0-9]+)/i,
                date: /(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2})/
            };

            const amount = smsContent.match(patterns.received)?.[1];
            const senderIdentifier = smsContent.match(patterns.sender)?.[1];
            const reference = smsContent.match(patterns.reference)?.[1];
            const dateStr = smsContent.match(patterns.date)?.[1];

            if (!amount || !senderIdentifier) {
                return null;
            }

            return {
                walletType: 'instapay',
                amount: parseFloat(amount),
                senderPhone: senderIdentifier, // Could be email or phone
                transactionReference: reference || null,
                transferTimestamp: dateStr ? this.parseDateTime(dateStr) : new Date(),
                rawSMS: smsContent
            };
        } catch (error) {
            logger.error('Error parsing InstaPay SMS', { error: error.message });
            return null;
        }
    }

    /**
     * Parse Orange Cash SMS
     */
    parseOrangeCash(smsContent) {
        try {
            const patterns = {
                received: /(?:received|استلمت)\s+(\d+\.?\d*)\s*(?:EGP|جنيه)/i,
                sender: /from\s+(\d{11})/i,
                reference: /(?:Ref|Reference)[:\s]+([A-Z0-9]+)/i,
                date: /(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2})/
            };

            const amount = smsContent.match(patterns.received)?.[1];
            const senderPhone = smsContent.match(patterns.sender)?.[1];
            const reference = smsContent.match(patterns.reference)?.[1];
            const dateStr = smsContent.match(patterns.date)?.[1];

            if (!amount || !senderPhone) {
                return null;
            }

            return {
                walletType: 'orange_cash',
                amount: parseFloat(amount),
                senderPhone: senderPhone,
                transactionReference: reference || null,
                transferTimestamp: dateStr ? this.parseDateTime(dateStr) : new Date(),
                rawSMS: smsContent
            };
        } catch (error) {
            logger.error('Error parsing Orange Cash SMS', { error: error.message });
            return null;
        }
    }

    /**
     * Auto-detect wallet type and parse SMS
     */
    parseIncomingSMS(smsContent, senderNumber = null) {
        // Detect wallet type from sender number or SMS content
        const vodafoneNumbers = ['Vodafone', 'VF-Cash', '9090'];
        const instaPayNumbers = ['InstaPay', 'IP'];
        const orangeNumbers = ['Orange', 'OR-Cash'];

        // Try to detect from sender
        if (senderNumber) {
            if (vodafoneNumbers.some(num => senderNumber.includes(num))) {
                return this.parseVodafoneCash(smsContent);
            }
            if (instaPayNumbers.some(num => senderNumber.includes(num))) {
                return this.parseInstaPay(smsContent);
            }
            if (orangeNumbers.some(num => senderNumber.includes(num))) {
                return this.parseOrangeCash(smsContent);
            }
        }

        // Try to detect from content
        if (smsContent.toLowerCase().includes('vodafone') || smsContent.includes('VF-')) {
            return this.parseVodafoneCash(smsContent);
        }
        if (smsContent.toLowerCase().includes('instapay')) {
            return this.parseInstaPay(smsContent);
        }
        if (smsContent.toLowerCase().includes('orange')) {
            return this.parseOrangeCash(smsContent);
        }

        // Try all parsers
        return this.parseVodafoneCash(smsContent) ||
            this.parseInstaPay(smsContent) ||
            this.parseOrangeCash(smsContent);
    }

    /**
     * Parse date/time string to Date object
     */
    parseDateTime(dateStr) {
        try {
            // Format: "13/12/2025 23:30"
            const [datePart, timePart] = dateStr.split(' ');
            const [day, month, year] = datePart.split('/');
            const [hour, minute] = timePart.split(':');

            return new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
                parseInt(hour),
                parseInt(minute)
            );
        } catch (error) {
            logger.error('Error parsing date/time', { dateStr, error: error.message });
            return new Date();
        }
    }

    /**
     * Validate parsed SMS data
     */
    validateParsedData(parsedData) {
        if (!parsedData) return false;

        const required = ['walletType', 'amount', 'senderPhone'];
        const hasRequired = required.every(field => parsedData[field]);

        if (!hasRequired) {
            logger.warn('Parsed SMS missing required fields', { parsedData });
            return false;
        }

        if (parsedData.amount <= 0) {
            logger.warn('Invalid amount in parsed SMS', { amount: parsedData.amount });
            return false;
        }

        return true;
    }
}

module.exports = new SMSParserService();
