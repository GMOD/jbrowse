/*
 * (C) Copyright HCL Technologies Ltd. 2019
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * Returns a function to unwrap a wrapped promise.  This is needed when
 * an AMD module that returns a promise as the value of the module is
 * required within CommonJS code.
 */
 module.exports = function(m) {return m && m['__DOJO_WEBPACK_PROMISE_VALUE__'] || m;};