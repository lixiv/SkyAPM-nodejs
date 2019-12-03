"use strict";

const Plugin = require("../plugin");
const semver = require("semver");


module.exports = new Plugin("mysql2-plugin", "mysql2", [{
    _name: "v2",
    _description: "Only enhancements to version 2.x",
    _enhanceModules: ["mysql2"],
    canEnhance: function(version, enhanceFile) {
        if (this._enhanceModules.indexOf(enhanceFile) > -1 && semver.satisfies(version, ">=1 <3")) {
            return true;
        }
        return false;
    },
    getInterceptor: function(enhanceFile) {
        return require("./" + enhanceFile);
    },
}]);

