module.exports = {
    default: {
        paths: ['tests/features/core/order_lifecycle.feature'],
        require: [
            'tests/step_definitions/order_lifecycle_adapter_steps.js',
            'tests/support/hooks.js',
            'tests/support/world.js'
        ],
        format: ['progress', 'summary'],
        publishQuiet: true
    }
};
