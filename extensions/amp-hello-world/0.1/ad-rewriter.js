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
 * LinkRewriter works together with LinkRewriterManager to allow rewriting
 * links at click time. E.g: Replacing a link by its affiliate version only if
 * the link can be monetised.
 *
 * A page can have multiple LinkRewriter running at the same time.
 *
 * LinkRewriter class is in charge of:
 * - Scanning the page to find links based on an optional CSS selector.
 *
 * - Asking the "resolveUnknownLinks" function which links can be replaced
 *   so we already know the replacement URL at click time.
 *
 * - Keeping track of the replacement link of each links on the page.
 *
 * - Swapping the anchor url to its replacement url when instructed
 *   by the LinkRewriterManager.
 */
export class AdRewriter {
  /**
   * @param {!Document|!ShadowRoot} rootNode
   * @param {string} id
   * @param {function(!Array<!HTMLElement>):!TwoStepsResponse} resolveUnknownLinks
   * @param {?{linkSelector: string}=} options
   */
  constructor(ampdoc) {
    /**
     * Use getRootNode() to support "shadow AMP" mode where the rootNode is not
     * necessarily the page document.
     * See https://www.ampproject.org/docs/integration/pwa-amp/amp-in-pwa
     * @private {!Document|!ShadowRoot}
     */
    this.rootNode_ = ampdoc.getRootNode();

    /** @public {!../../../../src/observable.Observable} */
    //this.events = new Observable();

    /** @public {string} */
    //this.id = id;

    /** @private {string} */
    this.adSelector_ = 'amp-ad';

    /** @private {!./link-replacement-cache.LinkReplacementCache} */
    // TODO: not sure if dictionaries allowed?
    //this.adCache = [];

    this.installGlobalEventListener_(this.rootNode_);
  }

  triggerInitialScan() {
    this.onDomUpdated_();
  }

  /**
   * This function is called when the user clicks on a link.
   * It swaps temporarly the href of an anchor by its associated
   * replacement url but only for the time needed by the browser
   * to handle the click on the anchor and navigate to the new url.
   * After 300ms, if the page is still open (target="_blank" scenario),
   * the link is restored to its initial value.
   * @param {!HTMLElement} anchor
   * @return {boolean} - 'true' if the linkRewriter has changed the url
   *  'false' otherwise.
   * @public
   */
  rewriteAd_(ad) {
    /*const newUrl = this.getReplacementUrl(anchor);
    if (!newUrl || newUrl === anchor.href) {
      return false;
    }*/
    // TODO: Append to the json attribute if it already exists
    ad.setAttribute("json", '{"targeting":{"permutive": "josh-test"}}');
    //anchor.setAttribute(ORIGINAL_URL_ATTRIBUTE, anchor.href);
    //anchor.href = newUrl;
    return true;
  }

  installGlobalEventListener_(rootNode) {
    rootNode.addEventListener(
      AmpEvents.DOM_UPDATE,
      this.onDomUpdated_.bind(this)
    );
  }

  /**
   * Scan the page to find links and send "page_scanned" event when scan
   * is completed and we know the replacement url of all the links
   * currently in the DOM.
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
   * Scan the page to find all the links on the page.
   * If new anchors are discovered, ask to the "resolveUnknownLinks"
   * function what is the replacement url for each anchor. The response
   * which can be synchronous, asynchronous or both at the same time will be
   * stored internally and used if a click on one of this anchor happens later.
   * @return {!Promise}
   * @private
   */
  scanAdsOnPage_() {
    console.log("Scanning ads...");

    this.adList = this.getAdsInDOM_();

    console.log("Found ads: " + this.adList);

    this.adList.map(this.rewriteAd_);

    // Get the list of new links.
    //const newAds = this.getNewAds_(adList);
    // Delete anchors removed from the DOM so they can be garbage
    // collected.
    //this.anchorReplacementCache_.updateLinkList(anchorList);

    /*if (!adList.length) {
      return Promise.resolve();
    }*/

    // Register all new anchors discovered as "unknown" status.
    // Note: Only anchors with a status will be considered in the click
    // handlers. (Other anchors are assumed to be the ones exluded by
    // linkSelector_)
    /*this.anchorReplacementCache_.updateReplacementUrls(
      unknownAnchors.map(anchor => ({anchor, replacementUrl: null}))
    );

    this.anchorReplacementCache_.updateReplacementUrls(
      twoStepsResponse.syncResponse
    );*/

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
   * Get the list of anchors element in the page.
   * (Based on linkSelector option)
   * @return {!Array<!HTMLElement>}
   * @private
   */
  getAdsInDOM_() {
    const q = this.rootNode_.querySelectorAll(this.adSelector_);
    return [].slice.call(q);
  }
}
