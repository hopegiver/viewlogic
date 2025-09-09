/**
 * Babel configuration for ViewLogic Router
 */

export default {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {
                    node: 'current'
                }
            }
        ]
    ],
    plugins: [
        // Add any additional plugins here if needed
    ]
};