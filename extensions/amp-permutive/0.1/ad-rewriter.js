/**
 * Copyright 2018 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {AmpEvents} from '../../../src/amp-events';
import {ChunkPriority, chunk} from '../../../src/chunk';
//import {LinkReplacementCache} from './link-replacement-cache';
//import {Observable} from '../../../../src/observable';
//import {TwoStepsResponse} from './two-steps-response';
//import {userAssert} from '../../../../src/log';

/** @typedef {!Array<{anchor: !HTMLElement, replacementUrl: ?string}>}} */
//export let AnchorReplacementList;

/**
 * AdRewriter allow rewriting amp-ad elements and appending additional
 * targeting data where possible. This enables dynamic targeting values
 * to be set without reliance on an AMP RTC call.
 *
 * AdRewriter class is in charge of:
 * - Scanning the page to find amp-ads
 * - //TODO: do proper documentation
 */
export class AdRewriter {
  /**
   * @param {!Document|!ShadowRoot} rootNode
   * //TODO: add @param documentation
   */
  constructor(ampdoc, key, value) {
    /**
     * Use getRootNode() to support "shadow AMP" mode where the rootNode is not
     * necessarily the page document.
     * See https://www.ampproject.org/docs/integration/pwa-amp/amp-in-pwa
     * @private {!Document|!ShadowRoot}
     */
    this.rootNode_ = ampdoc.getRootNode();

    // TODO: make AdRewriter constructor take a more generic targeting
    // dictionary rather than a single key and single value
    this.key = key;
    this.value = value;

    /** @private {string} */
    this.adSelector_ = 'amp-ad';

    this.adList_ = [];

    this.installGlobalEventListener_(this.rootNode_);
  }

  triggerInitialScan() {
    this.onDomUpdated_();
  }

  /**
   * This function is called when the page loads and whenever the
   * the DOM is updated. It appends dynamic targeting data to amp-ad
   * elements where possible.
   * @param {!HTMLElement} amp-ad
   * @return {boolean} - 'true' if the AdRewriter has changed the ad
   *  'false' otherwise.
   * @public
   */
  rewriteAd_(ad) {
    // TODO: check if this is a support amp-ad type (i.e. GAM)
    // return early if it's an unsupported type
    let json = JSON.parse(ad.getAttribute("json")) || {};
    json.targeting = json.targeting || {};
    json.targeting[this.key] = this.value;
    ad.setAttribute("json", JSON.stringify(json));
    return true;
  }

  installGlobalEventListener_(rootNode) {
    rootNode.addEventListener(
      AmpEvents.DOM_UPDATE,
      this.onDomUpdated_.bind(this)
    );
  }

  /**
   * Scan the page to find amp-ad elements and carry out
   * the rewrites where necessary.
   * @return {!Promise}
   * @public
   */
  onDomUpdated_() {
    return new Promise(resolve => {
      const task = () => {
        return this.scanAdsOnPage_().then(() => {
          //this.events.fire({type: EVENTS.PAGE_SCANNED});
          resolve();
        });
      };
      const elementOrShadowRoot =
        /** @type {!Element|!ShadowRoot} */ (this.rootNode_.nodeType ==
        Node.DOCUMENT_NODE
          ? this.rootNode_.documentElement
          : this.rootNode_);
      chunk(elementOrShadowRoot, task, ChunkPriority.LOW);
    });
  }

  /**
   * Scan the page to find all the amp-ads on the page.
   * If new amp-ads are discovered, rewrite them.
   * @return {!Promise}
   * @private
   */
  scanAdsOnPage_() {
    this.adList_ = this.getAdsInDOM_();

    // TODO: do we need tokeep track of ads we've already
    // rewritten and only rewrite the new ones?
    this.adList_.map(this.rewriteAd_.bind(this));

    return Promise.resolve();
  }

  /**
   * Filter the list of anchors to returns only the ones
   * that were not in the page at the time of the last page scan.
   * @param {!Array<!HTMLElement>} anchorList
   * @return {!Array<HTMLElement>}
   * @private
   */
  /*getNewAds_(adList) {
    const newAds = [];
    adList.forEach(ad => {
      // If link is not already in cache
      if (!this.isWatchingAd(ad)) {
        newAds.push(ad);
      }
    });

    return newAds;
  }*/

  /**
   * Get the list of amp-ad elements in the page.
   * (Based on adSelector option)
   * @return {!Array<!HTMLElement>}
   * @private
   */
  getAdsInDOM_() {
    const q = this.rootNode_.querySelectorAll(this.adSelector_);
    return [].slice.call(q);
  }
}
