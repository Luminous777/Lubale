const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watcherOptions = { useWatchman: false };

module.exports = config;
