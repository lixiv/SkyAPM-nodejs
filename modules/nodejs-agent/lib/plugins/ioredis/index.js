/*
 * Licensed to the SkyAPM under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

const Plugin = require("../plugin");
const semver = require("semver");

module.exports = new Plugin("ioredis-plugin", "ioredis", [{
    _name: "",
    _description: "Only enhancements to ioredis",
    _enhanceModules: ["ioredis"],
    canEnhance: function(version, enhanceFile) {
        if (this._enhanceModules.indexOf(enhanceFile) > -1 && semver.satisfies(version, ">=2.0.0 <5.0.0")) {
            return true;
        }
        return false;
    },
    getInterceptor: function(enhanceFile) {
        return require("./" + enhanceFile);
    },
}]);
