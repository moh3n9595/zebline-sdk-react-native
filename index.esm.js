import { NativeModules, Platform } from 'react-native';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var AsyncLock$1 = function (opts) {
	opts = opts || {};

	this.Promise = opts.Promise || Promise;

	// format: {key : [fn, fn]}
	// queues[key] = null indicates no job running for key
	this.queues = Object.create(null);

	// lock is reentrant for same domain
	this.domainReentrant = opts.domainReentrant || false;
	if (this.domainReentrant) {
		if (typeof process === 'undefined' || typeof process.domain === 'undefined') {
			throw new Error(
				'Domain-reentrant locks require `process.domain` to exist. Please flip `opts.domainReentrant = false`, ' +
				'use a NodeJS version that still implements Domain, or install a browser polyfill.');
		}
		// domain of current running func {key : fn}
		this.domains = Object.create(null);
	}

	this.timeout = opts.timeout || AsyncLock$1.DEFAULT_TIMEOUT;
	this.maxOccupationTime = opts.maxOccupationTime || AsyncLock$1.DEFAULT_MAX_OCCUPATION_TIME;
	this.maxExecutionTime = opts.maxExecutionTime || AsyncLock$1.DEFAULT_MAX_EXECUTION_TIME;
	if (opts.maxPending === Infinity || (Number.isInteger(opts.maxPending) && opts.maxPending >= 0)) {
		this.maxPending = opts.maxPending;
	} else {
		this.maxPending = AsyncLock$1.DEFAULT_MAX_PENDING;
	}
};

AsyncLock$1.DEFAULT_TIMEOUT = 0; //Never
AsyncLock$1.DEFAULT_MAX_OCCUPATION_TIME = 0; //Never
AsyncLock$1.DEFAULT_MAX_EXECUTION_TIME = 0; //Never
AsyncLock$1.DEFAULT_MAX_PENDING = 1000;

/**
 * Acquire Locks
 *
 * @param {String|Array} key 	resource key or keys to lock
 * @param {function} fn 	async function
 * @param {function} cb 	callback function, otherwise will return a promise
 * @param {Object} opts 	options
 */
AsyncLock$1.prototype.acquire = function (key, fn, cb, opts) {
	if (Array.isArray(key)) {
		return this._acquireBatch(key, fn, cb, opts);
	}

	if (typeof (fn) !== 'function') {
		throw new Error('You must pass a function to execute');
	}

	// faux-deferred promise using new Promise() (as Promise.defer is deprecated)
	var deferredResolve = null;
	var deferredReject = null;
	var deferred = null;

	if (typeof (cb) !== 'function') {
		opts = cb;
		cb = null;

		// will return a promise
		deferred = new this.Promise(function(resolve, reject) {
			deferredResolve = resolve;
			deferredReject = reject;
		});
	}

	opts = opts || {};

	var resolved = false;
	var timer = null;
	var occupationTimer = null;
	var executionTimer = null;
	var self = this;

	var done = function (locked, err, ret) {

		if (occupationTimer) {
			clearTimeout(occupationTimer);
			occupationTimer = null;
		}

		if (executionTimer) {
			clearTimeout(executionTimer);
			executionTimer = null;
		}

		if (locked) {
			if (!!self.queues[key] && self.queues[key].length === 0) {
				delete self.queues[key];
			}
			if (self.domainReentrant) {
				delete self.domains[key];
			}
		}

		if (!resolved) {
			if (!deferred) {
				if (typeof (cb) === 'function') {
					cb(err, ret);
				}
			}
			else {
				//promise mode
				if (err) {
					deferredReject(err);
				}
				else {
					deferredResolve(ret);
				}
			}
			resolved = true;
		}

		if (locked) {
			//run next func
			if (!!self.queues[key] && self.queues[key].length > 0) {
				self.queues[key].shift()();
			}
		}
	};

	var exec = function (locked) {
		if (resolved) { // may due to timed out
			return done(locked);
		}

		if (timer) {
			clearTimeout(timer);
			timer = null;
		}

		if (self.domainReentrant && locked) {
			self.domains[key] = process.domain;
		}

		var maxExecutionTime = opts.maxExecutionTime || self.maxExecutionTime;
		if (maxExecutionTime) {
			executionTimer = setTimeout(function () {
				if (!!self.queues[key]) {
					done(locked, new Error('Maximum execution time is exceeded ' + key));
				}
			}, maxExecutionTime);
		}

		// Callback mode
		if (fn.length === 1) {
			var called = false;
			try {
				fn(function (err, ret) {
					if (!called) {
						called = true;
						done(locked, err, ret);
					}
				});
			} catch (err) {
				// catching error thrown in user function fn
				if (!called) {
					called = true;
					done(locked, err);
				}
			}
		}
		else {
			// Promise mode
			self._promiseTry(function () {
				return fn();
			})
			.then(function(ret){
				done(locked, undefined, ret);
			}, function(error){
				done(locked, error);
			});
		}
	};

	if (self.domainReentrant && !!process.domain) {
		exec = process.domain.bind(exec);
	}

	if (!self.queues[key]) {
		self.queues[key] = [];
		exec(true);
	}
	else if (self.domainReentrant && !!process.domain && process.domain === self.domains[key]) {
		// If code is in the same domain of current running task, run it directly
		// Since lock is re-enterable
		exec(false);
	}
	else if (self.queues[key].length >= self.maxPending) {
		done(false, new Error('Too many pending tasks in queue ' + key));
	}
	else {
		var taskFn = function () {
			exec(true);
		};
		if (opts.skipQueue) {
			self.queues[key].unshift(taskFn);
		} else {
			self.queues[key].push(taskFn);
		}

		var timeout = opts.timeout || self.timeout;
		if (timeout) {
			timer = setTimeout(function () {
				timer = null;
				done(false, new Error('async-lock timed out in queue ' + key));
			}, timeout);
		}
	}

	var maxOccupationTime = opts.maxOccupationTime || self.maxOccupationTime;
		if (maxOccupationTime) {
			occupationTimer = setTimeout(function () {
				if (!!self.queues[key]) {
					done(false, new Error('Maximum occupation time is exceeded in queue ' + key));
				}
			}, maxOccupationTime);
		}

	if (deferred) {
		return deferred;
	}
};

/*
 * Below is how this function works:
 *
 * Equivalent code:
 * self.acquire(key1, function(cb){
 *     self.acquire(key2, function(cb){
 *         self.acquire(key3, fn, cb);
 *     }, cb);
 * }, cb);
 *
 * Equivalent code:
 * var fn3 = getFn(key3, fn);
 * var fn2 = getFn(key2, fn3);
 * var fn1 = getFn(key1, fn2);
 * fn1(cb);
 */
AsyncLock$1.prototype._acquireBatch = function (keys, fn, cb, opts) {
	if (typeof (cb) !== 'function') {
		opts = cb;
		cb = null;
	}

	var self = this;
	var getFn = function (key, fn) {
		return function (cb) {
			self.acquire(key, fn, cb, opts);
		};
	};

	var fnx = keys.reduceRight(function (prev, key) {
		return getFn(key, prev);
	}, fn);

	if (typeof (cb) === 'function') {
		fnx(cb);
	}
	else {
		return new this.Promise(function (resolve, reject) {
			// check for promise mode in case keys is empty array
			if (fnx.length === 1) {
				fnx(function (err, ret) {
					if (err) {
						reject(err);
					}
					else {
						resolve(ret);
					}
				});
			} else {
				resolve(fnx());
			}
		});
	}
};

/*
 *	Whether there is any running or pending asyncFunc
 *
 *	@param {String} key
 */
AsyncLock$1.prototype.isBusy = function (key) {
	if (!key) {
		return Object.keys(this.queues).length > 0;
	}
	else {
		return !!this.queues[key];
	}
};

/**
 * Promise.try() implementation to become independent of Q-specific methods
 */
AsyncLock$1.prototype._promiseTry = function(fn) {
	try {
		return this.Promise.resolve(fn());
	} catch (e) {
		return this.Promise.reject(e);
	}
};

var lib = AsyncLock$1;

var asyncLock = lib;

var AsyncLock = /*@__PURE__*/getDefaultExportFromCjs(asyncLock);

var VERBOSE = 5;
var DEBUG = 4;
var INFO = 3;
var WARN = 2;
var ERROR = 1;
var NONE = 0;
var _logLevel = ERROR;
var logInit = function (logLevel) {
  _logLevel = logLevel;
};
var logDebug = function (message) {
  if (_logLevel >= DEBUG) {
    console.log("RudderSDK: Debug: ".concat(message));
  }
};
var logWarn = function (message) {
  if (_logLevel >= WARN) {
    console.log("RudderSDK: Warn: ".concat(message));
  }
};
var logError = function (message) {
  if (_logLevel >= ERROR) {
    console.log("RudderSDK: Error: ".concat(message));
  }
};
var RUDDER_LOG_LEVEL = {
  NONE: NONE,
  ERROR: ERROR,
  WARN: WARN,
  INFO: INFO,
  DEBUG: DEBUG,
  VERBOSE: VERBOSE
};

var DATA_PLANE_URL = 'https://hosted.rudderlabs.com';
var CONTROL_PLANE_URL = 'https://api.rudderlabs.com';
var FLUSH_QUEUE_SIZE = 30;
var DB_COUNT_THRESHOLD = 10000;
var SLEEP_TIMEOUT = 10;
var CONFIG_REFRESH_INTERVAL = 2;
var AUTO_COLLECT_ADVERT_ID = false;
var TRACK_LIFECYCLE_EVENTS = true;
var RECORD_SCREEN_VIEWS = false;
var LOG_LEVEL = RUDDER_LOG_LEVEL.ERROR;
var SDK_VERSION = '1.15.0';
var AUTO_SESSION_TRACKING = true;
var SESSION_TIMEOUT = 300000;
var ENABLE_BACKGROUND_MODE = false;
var COLLECT_DEVICE_ID = true;
var ENABLE_GZIP = true;

var configure = function (writeKey_1, _a) {
  return __awaiter(void 0, [writeKey_1, _a], void 0, function (writeKey, _b) {
    var integrations, config;
    var _c = _b.dataPlaneUrl,
      dataPlaneUrl = _c === void 0 ? DATA_PLANE_URL : _c,
      _d = _b.controlPlaneUrl,
      controlPlaneUrl = _d === void 0 ? CONTROL_PLANE_URL : _d,
      _e = _b.flushQueueSize,
      flushQueueSize = _e === void 0 ? FLUSH_QUEUE_SIZE : _e,
      _f = _b.dbCountThreshold,
      dbCountThreshold = _f === void 0 ? DB_COUNT_THRESHOLD : _f,
      _g = _b.sleepTimeOut,
      sleepTimeOut = _g === void 0 ? SLEEP_TIMEOUT : _g,
      _h = _b.logLevel,
      logLevel = _h === void 0 ? LOG_LEVEL : _h,
      _j = _b.autoSessionTracking,
      autoSessionTracking = _j === void 0 ? AUTO_SESSION_TRACKING : _j,
      _k = _b.sessionTimeout,
      sessionTimeout = _k === void 0 ? SESSION_TIMEOUT : _k,
      _l = _b.enableBackgroundMode,
      enableBackgroundMode = _l === void 0 ? ENABLE_BACKGROUND_MODE : _l,
      _m = _b.configRefreshInterval,
      configRefreshInterval = _m === void 0 ? CONFIG_REFRESH_INTERVAL : _m,
      _o = _b.autoCollectAdvertId,
      autoCollectAdvertId = _o === void 0 ? AUTO_COLLECT_ADVERT_ID : _o,
      _p = _b.trackAppLifecycleEvents,
      trackAppLifecycleEvents = _p === void 0 ? TRACK_LIFECYCLE_EVENTS : _p,
      _q = _b.recordScreenViews,
      recordScreenViews = _q === void 0 ? RECORD_SCREEN_VIEWS : _q,
      _r = _b.collectDeviceId,
      collectDeviceId = _r === void 0 ? COLLECT_DEVICE_ID : _r,
      _s = _b.enableGzip,
      enableGzip = _s === void 0 ? ENABLE_GZIP : _s,
      dbEncryption = _b.dbEncryption,
      _t = _b.withFactories,
      withFactories = _t === void 0 ? [] : _t;
    return __generator(this, function (_u) {
      switch (_u.label) {
        case 0:
          integrations = withFactories;
          if (!(integrations && integrations.length > 0)) return [3 /*break*/, 2];
          // ask about await
          return [4 /*yield*/, Promise.all(integrations.map(function (integration) {
            return __awaiter(void 0, void 0, void 0, function () {
              return __generator(this, function (_a) {
                return [2 /*return*/, typeof integration === 'function' ? integration() : null];
              });
            });
          }))];
        case 1:
          // ask about await
          _u.sent();
          _u.label = 2;
        case 2:
          if (!(dbEncryption !== undefined)) return [3 /*break*/, 4];
          return [4 /*yield*/, dbEncryption.addDBEncryptionPlugin(dbEncryption.key, dbEncryption.enable)];
        case 3:
          _u.sent();
          _u.label = 4;
        case 4:
          config = {
            writeKey: writeKey,
            dataPlaneUrl: dataPlaneUrl,
            controlPlaneUrl: controlPlaneUrl,
            flushQueueSize: flushQueueSize,
            dbCountThreshold: dbCountThreshold,
            sleepTimeOut: sleepTimeOut,
            logLevel: logLevel,
            autoSessionTracking: autoSessionTracking,
            sessionTimeout: sessionTimeout,
            configRefreshInterval: configRefreshInterval,
            autoCollectAdvertId: autoCollectAdvertId,
            trackAppLifecycleEvents: trackAppLifecycleEvents,
            enableBackgroundMode: enableBackgroundMode,
            recordScreenViews: recordScreenViews,
            collectDeviceId: collectDeviceId,
            enableGzip: enableGzip
          };
          return [2 /*return*/, config];
      }
    });
  });
};

var bridge = NativeModules.RNRudderSdkModule;
if (!bridge) {
  throw new Error('Failed to load Rudderlabs native module.');
}

/* eslint-disable @typescript-eslint/no-explicit-any */
var isValueNaN = function (val) {
  return typeof val === 'number' && Number.isNaN(val);
};
var isPlainObject = function (value) {
  return Object.prototype.toString.call(value) === '[object Object]';
};
var filterNaNInternal = function (value) {
  if (value === null) {
    return value;
  }
  var updatedObj;
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      updatedObj = [];
      value.forEach(function (element) {
        if (!isValueNaN(element)) {
          updatedObj.push(filterNaNInternal(element));
        }
      });
    } else if (isPlainObject(value)) {
      updatedObj = {};
      Object.entries(value).forEach(function (_a) {
        var key = _a[0],
          val = _a[1];
        if (!isValueNaN(val)) {
          updatedObj[key] = filterNaNInternal(val);
        }
      });
    } else {
      updatedObj = value;
    }
  }
  // We're not handling for 'number' type here
  // because the assumption is that the input of the first invocation
  // of this function is an object.
  // For nested objects, we're already filtering the NaN values in the 'if' block.
  else {
    updatedObj = value;
  }
  return updatedObj;
};
var filterNaN = function (value) {
  try {
    return filterNaNInternal(value);
  } catch (err) {
    logError('An error occurred while filtering NaN values: ' + err);
    return value;
  }
};

var lock = new AsyncLock();
function validateConfiguration(configuration) {
  if (configuration.controlPlaneUrl && typeof configuration.controlPlaneUrl != 'string') {
    logWarn("setup : 'controlPlaneUrl' must be a string. Falling back to the default value");
    delete configuration.controlPlaneUrl;
  }
  if (configuration.flushQueueSize && !Number.isInteger(configuration.flushQueueSize)) {
    logWarn("setup : 'flushQueueSize' must be an integer. Falling back to the default value");
    delete configuration.flushQueueSize;
  }
  if (configuration.dbCountThreshold && !Number.isInteger(configuration.dbCountThreshold)) {
    logWarn("setup : 'dbCountThreshold' must be an integer. Falling back to the default value");
    delete configuration.dbCountThreshold;
  }
  if (configuration.sleepTimeOut && !Number.isInteger(configuration.sleepTimeOut)) {
    logWarn("setup : 'sleepTimeOut' must be an integer. Falling back to the default value");
    delete configuration.sleepTimeOut;
  }
  if (configuration.logLevel && !Number.isInteger(configuration.logLevel)) {
    logWarn("setup : 'logLevel' must be an integer. Use RUDDER_LOG_LEVEL to set this value.Falling back to the default value");
    delete configuration.logLevel;
  }
  if (configuration.configRefreshInterval && !Number.isInteger(configuration.configRefreshInterval)) {
    logWarn("setup : 'configRefreshInterval' must be an integer.  Falling back to the default value");
    delete configuration.configRefreshInterval;
  }
  if (configuration.trackAppLifecycleEvents && typeof configuration.trackAppLifecycleEvents != 'boolean') {
    logWarn("setup : 'trackAppLifecycleEvents' must be a boolen. Falling back to the default value");
    delete configuration.trackAppLifecycleEvents;
  }
  if (configuration.recordScreenViews && typeof configuration.recordScreenViews != 'boolean') {
    logWarn("setup : 'recordScreenViews' must be a boolen. Falling back to the default value");
    delete configuration.recordScreenViews;
  }
  if (configuration.autoCollectAdvertId && typeof configuration.autoCollectAdvertId != 'boolean') {
    logWarn("setup : 'autoCollectAdvertId' must be a boolen. Falling back to the default value");
    delete configuration.autoCollectAdvertId;
  }
  if (configuration.autoSessionTracking && typeof configuration.autoSessionTracking != 'boolean') {
    logWarn("setup : 'autoSessionTracking' must be a boolen. Falling back to the default value");
    delete configuration.autoSessionTracking;
  }
  if (configuration.sessionTimeout && !Number.isInteger(configuration.sessionTimeout)) {
    logWarn("setup : 'sessionTimeout' must be an integer. Falling back to the default value");
    delete configuration.sessionTimeout;
  }
  if (configuration.enableBackgroundMode && typeof configuration.enableBackgroundMode != 'boolean') {
    logWarn("setup : 'enableBackgroundMode' must be a boolen. Falling back to the default value");
    delete configuration.enableBackgroundMode;
  }
  if (configuration.collectDeviceId && typeof configuration.collectDeviceId != 'boolean') {
    logWarn("setup : 'collectDeviceId' must be a boolean. Falling back to the default value");
    delete configuration.collectDeviceId;
  }
  if (typeof configuration.enableGzip !== 'undefined' && typeof configuration.enableGzip != 'boolean') {
    logWarn("setup : 'enableGzip' must be a boolean. Falling back to the default value ".concat(ENABLE_GZIP));
    delete configuration.enableGzip;
  }
}
// setup the RudderSDK with writeKey and Config
function setup(writeKey_1) {
  return __awaiter(this, arguments, void 0, function (writeKey, configuration, options) {
    if (configuration === void 0) {
      configuration = {};
    }
    if (options === void 0) {
      options = null;
    }
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          if (writeKey == undefined || typeof writeKey != 'string' || writeKey == '') {
            logError('setup: writeKey is incorrect. Aborting');
            return [2 /*return*/];
          }
          if (!configuration.dataPlaneUrl || typeof configuration.dataPlaneUrl != 'string' || configuration.dataPlaneUrl == '') {
            logError('setup: dataPlaneUrl is incorrect. Aborting');
            return [2 /*return*/];
          }
          // init log level
          if (configuration.logLevel && Number.isInteger(configuration.logLevel)) {
            logInit(configuration.logLevel);
          }
          logDebug("Initializing Rudder RN SDK version: ".concat(SDK_VERSION));
          validateConfiguration(configuration);
          // Acquire a lock before calling the setup of Native Modules
          return [4 /*yield*/, lock.acquire('lock', function (done) {
            return __awaiter(this, void 0, void 0, function () {
              var config;
              return __generator(this, function (_a) {
                switch (_a.label) {
                  case 0:
                    return [4 /*yield*/, configure(writeKey, configuration)];
                  case 1:
                    config = _a.sent();
                    logDebug('setup: created config');
                    return [4 /*yield*/, bridge.setup(config, options)];
                  case 2:
                    _a.sent();
                    logDebug('setup: setup completed');
                    done();
                    return [2 /*return*/];
                }
              });
            });
          })];
        case 1:
          // Acquire a lock before calling the setup of Native Modules
          _a.sent();
          return [2 /*return*/];
      }
    });
  });
}
// wrapper for `track` method
function track(event_1) {
  return __awaiter(this, arguments, void 0, function (event, properties, options) {
    if (properties === void 0) {
      properties = null;
    }
    if (options === void 0) {
      options = null;
    }
    return __generator(this, function (_a) {
      if (event == undefined) {
        logWarn("track: Mandatory field 'event' missing");
        return [2 /*return*/];
      }
      if (typeof event != 'string') {
        logWarn("track: 'event' must be a string");
        return [2 /*return*/];
      }
      bridge.track(event, filterNaN(properties), filterNaN(options));
      return [2 /*return*/];
    });
  });
}
// wrapper for `screen` method
function screen(name_1) {
  return __awaiter(this, arguments, void 0, function (name, properties, options) {
    if (properties === void 0) {
      properties = null;
    }
    if (options === void 0) {
      options = null;
    }
    return __generator(this, function (_a) {
      if (name == undefined) {
        logWarn("screen: Mandatory field 'name' missing");
        return [2 /*return*/];
      }
      if (typeof name != 'string') {
        logWarn("screen: 'name' must be a string");
        return [2 /*return*/];
      }
      bridge.screen(name, filterNaN(properties), filterNaN(options));
      return [2 /*return*/];
    });
  });
}
function identify(userIdOrTraits_1) {
  return __awaiter(this, arguments, void 0, function (userIdOrTraits, traitsOrOptions, options) {
    var _userId, _traits, _options;
    if (traitsOrOptions === void 0) {
      traitsOrOptions = null;
    }
    if (options === void 0) {
      options = null;
    }
    return __generator(this, function (_a) {
      if (userIdOrTraits == undefined) {
        logWarn('identify: atleast one of userId or traits is required');
        return [2 /*return*/];
      }
      if (typeof userIdOrTraits == 'string') {
        // userIdOrTraits contains userId
        _userId = userIdOrTraits;
        _traits = traitsOrOptions;
        _options = options;
      } else if (typeof userIdOrTraits == 'object') {
        // userIdOrTraits contains traits
        _userId = '';
        _traits = userIdOrTraits;
        _options = traitsOrOptions;
      } else {
        logWarn('identify : Unsupported argument type passed to identify');
        return [2 /*return*/];
      }
      bridge.identify(_userId, filterNaN(_traits), filterNaN(_options));
      return [2 /*return*/];
    });
  });
}
// wrapper for `group` method
function group(groupId_1) {
  return __awaiter(this, arguments, void 0, function (groupId, traits, options) {
    if (traits === void 0) {
      traits = null;
    }
    if (options === void 0) {
      options = null;
    }
    return __generator(this, function (_a) {
      if (groupId == undefined) {
        logWarn("group: Mandatory field 'groupId' missing");
        return [2 /*return*/];
      }
      if (typeof groupId != 'string') {
        logWarn("group: 'groupId' must be a string");
        return [2 /*return*/];
      }
      bridge.group(groupId, filterNaN(traits), filterNaN(options));
      return [2 /*return*/];
    });
  });
}
function alias(newOrPrevId, newIdOrOptions) {
  return __awaiter(this, void 0, void 0, function () {
    return __generator(this, function (_a) {
      if (newOrPrevId === undefined) {
        logWarn("alias: Mandatory field 'newId' missing");
        return [2 /*return*/, Promise.resolve()];
      }
      if (typeof newOrPrevId != 'string') {
        logWarn("alias: 'newId' must be a string");
        return [2 /*return*/, Promise.resolve()];
      }
      // this is to support the old alias method
      // alias('previousId', 'newId')
      // The previous ID is ignored.
      if (typeof newIdOrOptions == 'string') {
        return [2 /*return*/, bridge.alias(newIdOrOptions, null)];
      } else if (typeof newIdOrOptions == 'object' && !Array.isArray(newIdOrOptions)) {
        return [2 /*return*/, bridge.alias(newOrPrevId, filterNaN(newIdOrOptions))];
      } else {
        return [2 /*return*/, bridge.alias(newOrPrevId, null)];
      }
    });
  });
}
function putDeviceToken(token_1) {
  return __awaiter(this, arguments, void 0, function (token, iOSToken) {
    if (iOSToken === void 0) {
      iOSToken = null;
    }
    return __generator(this, function (_a) {
      if (Platform.OS == 'ios' && iOSToken) {
        bridge.putDeviceToken(iOSToken);
      } else if (token) {
        bridge.putDeviceToken(token);
      }
      return [2 /*return*/];
    });
  });
}
/**
 * @deprecated use putAdvertisingId{@link putAdvertisingId(advertisingId: string)} instead
 */
function setAdvertisingId(androidId, iOSId) {
  return __awaiter(this, void 0, void 0, function () {
    return __generator(this, function (_a) {
      switch (Platform.OS) {
        case 'ios':
          if (iOSId) {
            putAdvertisingId(iOSId);
          }
          break;
        case 'android':
          if (androidId) {
            putAdvertisingId(androidId);
          }
          break;
      }
      return [2 /*return*/];
    });
  });
}
function putAdvertisingId(advertisingId) {
  return __awaiter(this, void 0, void 0, function () {
    return __generator(this, function (_a) {
      if (advertisingId) {
        bridge.putAdvertisingId(advertisingId);
      }
      return [2 /*return*/];
    });
  });
}
function clearAdvertisingId() {
  return __awaiter(this, void 0, void 0, function () {
    return __generator(this, function (_a) {
      bridge.clearAdvertisingId();
      return [2 /*return*/];
    });
  });
}
/**
 * @deprecated use putAnonymousId{@link putAnonymousId(anonymousId: string)} instead
 */
function setAnonymousId(anonymousId) {
  return __awaiter(this, void 0, void 0, function () {
    return __generator(this, function (_a) {
      if (anonymousId) {
        putAnonymousId(anonymousId);
      }
      return [2 /*return*/];
    });
  });
}
function putAnonymousId(anonymousId) {
  return __awaiter(this, void 0, void 0, function () {
    return __generator(this, function (_a) {
      if (anonymousId) {
        bridge.putAnonymousId(anonymousId);
      }
      return [2 /*return*/];
    });
  });
}
function reset() {
  return __awaiter(this, arguments, void 0, function (clearAnonymousId) {
    var clearAnonymousIdVal;
    if (clearAnonymousId === void 0) {
      clearAnonymousId = false;
    }
    return __generator(this, function (_a) {
      clearAnonymousIdVal = clearAnonymousId === true;
      if (typeof clearAnonymousId !== 'boolean') {
        logWarn("reset: 'clearAnonymousId' must be a boolean");
      }
      bridge.reset(clearAnonymousIdVal);
      return [2 /*return*/];
    });
  });
}
function flush() {
  return __awaiter(this, void 0, void 0, function () {
    return __generator(this, function (_a) {
      bridge.flush();
      return [2 /*return*/];
    });
  });
}
function optOut(optOut) {
  return __awaiter(this, void 0, void 0, function () {
    var optOutVal;
    return __generator(this, function (_a) {
      optOutVal = optOut === true;
      if (typeof optOut !== 'boolean') {
        logWarn("optOut: 'optOut' must be a boolean");
      }
      bridge.optOut(optOutVal);
      return [2 /*return*/];
    });
  });
}
// eslint-disable-next-line @typescript-eslint/ban-types
function registerCallback(name, callback) {
  return __awaiter(this, void 0, void 0, function () {
    return __generator(this, function (_a) {
      if (name) {
        bridge.registerCallback(name, callback);
      }
      return [2 /*return*/];
    });
  });
}
function getRudderContext() {
  return __awaiter(this, void 0, void 0, function () {
    var context;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          return [4 /*yield*/, bridge.getRudderContext()];
        case 1:
          context = _a.sent();
          return [2 /*return*/, context !== null && context !== void 0 ? context : null];
      }
    });
  });
}
function startSession(sessionId) {
  return __awaiter(this, void 0, void 0, function () {
    return __generator(this, function (_a) {
      if (sessionId === undefined) {
        bridge.startSession('');
      } else if (!Number.isInteger(sessionId)) {
        logWarn("startSession: 'sessionId' must be an integer");
      } else {
        if (sessionId.toString().length < 10) {
          logWarn("startSession: 'sessionId' length should be at least 10, hence ignoring it");
          return [2 /*return*/];
        }
        bridge.startSession(sessionId.toString());
      }
      return [2 /*return*/];
    });
  });
}
function endSession() {
  return __awaiter(this, void 0, void 0, function () {
    return __generator(this, function (_a) {
      bridge.endSession();
      return [2 /*return*/];
    });
  });
}
function getSessionId() {
  return __awaiter(this, void 0, void 0, function () {
    var sessionId, e_1;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          _a.trys.push([0, 2,, 3]);
          return [4 /*yield*/, bridge.getSessionId()];
        case 1:
          sessionId = _a.sent();
          if (sessionId === null || sessionId === undefined) {
            return [2 /*return*/, null];
          }
          return [2 /*return*/, Number(sessionId)];
        case 2:
          e_1 = _a.sent();
          logError('getSessionId: Failed to get sessionId: ' + e_1);
          return [2 /*return*/, null];
        case 3:
          return [2 /*return*/];
      }
    });
  });
}
var rudderClient = {
  setup: setup,
  track: track,
  screen: screen,
  identify: identify,
  group: group,
  alias: alias,
  reset: reset,
  flush: flush,
  optOut: optOut,
  putDeviceToken: putDeviceToken,
  putAdvertisingId: putAdvertisingId,
  setAdvertisingId: setAdvertisingId,
  clearAdvertisingId: clearAdvertisingId,
  putAnonymousId: putAnonymousId,
  setAnonymousId: setAnonymousId,
  registerCallback: registerCallback,
  getRudderContext: getRudderContext,
  startSession: startSession,
  endSession: endSession,
  getSessionId: getSessionId
};

export { RUDDER_LOG_LEVEL, rudderClient as default };
