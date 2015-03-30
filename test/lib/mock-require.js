var path = require('path'),

    root = path.join(__dirname, '..', '..'),
    memory = require(path.join(root, 'node_modules', 'stylus', 'lib', 'cache', 'memory.js')),
    parser = require(path.join(root, 'node_modules', 'stylus', 'lib', 'parser.js')),
    normalizer = require(path.join(root, 'node_modules', 'stylus', 'lib', 'visitor', 'normalizer.js')),

    memoryId = path.join(root, 'node_modules', 'stylus', 'lib', 'cache', 'index.js'),
    parserId = path.join(root, 'node_modules', 'stylus', 'lib', 'visitor', 'evaluator.js'),
    normalizerId = path.join(root, 'node_modules', 'stylus', 'lib', 'functions', 'index.js'),

    Module = require('module'),
    originalLoader = Module._load;

Module._load = function (request, parent) {
    if (parent.id === memoryId && request === './memory') {
        return memory;
    }

    if (parent.id === parserId && request === '../parser') {
        return parser;
    }

    if (parent.id === normalizerId && request === '../visitor/normalizer') {
        return normalizer;
    }

    return originalLoader.apply(this, arguments);
};
