/**
 * Copyright 2020 The AMP HTML Authors. All Rights Reserved.
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

import {Deferred} from '../../../src/utils/promise';
import {Services} from '../../../src/services';
import {getData, listen} from '../../../src/event-helper';
import {getIframe, preloadBootstrap} from '../../../src/3p-frame';
import {createFrameFor} from '../../../src/iframe-video';
import {dict} from '../../../src/utils/object';
import {isLayoutSizeDefined} from '../../../src/layout';
import {isObject} from '../../../src/types';
import {listenFor} from '../../../src/iframe-helper';
import {AdRewriter} from './ad-rewriter';
import {removeElement} from '../../../src/dom';
import {tryParseJson} from '../../../src/json';

export class AmpPermutive extends AMP.BaseElement {

  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    /** @private {?HTMLIFrameElement} */
    this.iframe_ = null;

    this.ampDoc_ = null;

    /** @private {?Promise} */
    this.iframeReadyPromise_ = null;

    /** @private {?Promise<!../../../src/service/cid-impl.CidDef>} */
    this.clientIdService_ = Services.cidForDoc(this.element);

    /** @private {?Promise<JsonObject>} */
    this.clientIdPromise_ = null;

    /** @private {string} */
    this.myText_ = 'amp-permutive';

    /** @private {?Element} */
    this.container_ = null;

    this.adRewriter_ = null;
  }

  /**
   * @param {boolean=} opt_onLayout
   * @override
   */
  preconnectCallback(opt_onLayout) {
    const preconnect = Services.preconnectFor(this.win);
    preconnect.url(this.getAmpDoc(), 'https://trantor.amp.permutive.com', opt_onLayout);
    // Hosts the Permutive SDK.
    preconnect.preload(
      this.getAmpDoc(),
      'https://trantor.amp.permutive.com/amp-iframe.html?project=e0039147-51e7-4224-a814-0e2d438aabcd&key=da4d09b5-843a-4bd5-bd79-8cea7f69f730',
      //'https://connect.facebook.net/' + this.dataLocale_ + '/sdk.js',
      'script'
    );
    preloadBootstrap(this.win, this.getAmpDoc(), preconnect);
  }

  /** @override */
  buildCallback() {
    this.ampDoc_ = this.getAmpDoc();

    const deferred = new Deferred();
    this.iframeReadyPromise_ = deferred.promise;
    this.iframeReadyResolver_ = deferred.resolve;

    let targeting = this.win.localStorage.getItem("ptest") || "";

    this.adRewriter_ = new AdRewriter(this.ampDoc_, "permutive", targeting);
    this.adRewriter_.triggerInitialScan();

    // TODO: remove the lines below, it was from a hello world example
    this.container_ = this.element.ownerDocument.createElement('div');
    this.container_.textContent = this.myText_;
    this.element.appendChild(this.container_);
    this.applyFillContent(this.container_, /* replacedContent */ true);
  }

  /** @override */
  layoutCallback() {
    // TODO: build iframe src dynamically, from extension attributes
    // (e.g. we can make it <amp-permutive projectId="..." apiKey="..." />

    // TODO: this method of creating iframe will probably be rejected
    // as it's intended for videos.
    // We should try to do what amp-facebook does, and integrate with amp 3p.
    // This could also enable us to remove a link in chain of requests
    // Rather than cdn.ampproject => trantor.amp.permutive.com => cdn.permutive.com
    // We can probably load our SDK faster cdn.ampproject => cdn.permutive.com
    const iframe = createFrameFor(this, 'https://trantor.amp.permutive.com/amp-iframe.html?project=e0039147-51e7-4224-a814-0e2d438aabcd&key=da4d09b5-843a-4bd5-bd79-8cea7f69f730');

    this.iframe_ = iframe;

    this.getClientId_().then(clientId => {
      // send to iframe to trigger identify call
      this.sendCommand_('identify', clientId);
    });

    this.unlistenMessage_ = listen(
      this.win,
      'message',
      this.handlePermutiveMessages_.bind(this)
    );

    return this.loadPromise(iframe).then(() => this.iframeReadyResolver_());
  }

  /**
   * Gets a Promise to return the unique AMP clientId
   *
   * @private
   * @return {Promise<string>}
   */
  getClientId_() {
    if (!this.clientIdPromise_) {
      this.clientIdPromise_ = this.clientIdService_.then(data => {
        return data.get(
          // TODO: set scope appropriately
          // and differentiate between amp id and permutive cookie
          {scope: 'permutive', createCookieIfNotPresent: true},
          /* consent */ Promise.resolve()
        );
      });
    }
    return this.clientIdPromise_;
  }

  /**
   * @param {!Event} event
   * @private
   */
  handlePermutiveMessages_(event) {
    if (this.iframe_ && event.source != this.iframe_.contentWindow) {
      return;
    }
    const eventData = getData(event);
    if (!eventData) {
      return;
    }

    const parsedEventData = isObject(eventData)
      ? eventData
      : tryParseJson(eventData);
    if (!parsedEventData) {
      return;
    }

    if (parsedEventData['event'] === 'segments') {
      this.win.localStorage.setItem("ptest", parsedEventData['segments']);
    }
  }

  /**
   * Sends a command to the iframe through postMessage.
   * @param {string} command
   * @param {*=} arg
   * @private
   * */
  sendCommand_(command, arg) {
    this.iframeReadyPromise_.then(() => {
      // We still need to check this.iframe_ as the component may have
      // been unlaid out by now.
      if (this.iframe_ && this.iframe_.contentWindow) {
        this.iframe_.contentWindow./*OK*/ postMessage(
          JSON.stringify(
            dict({
              'command': command,
              'args': arg,
            })
          ),
          'https://trantor.amp.permutive.com'
        );
      }
    });
  }

  /** @override */
  isLayoutSupported(layout) {
    return isLayoutSizeDefined(layout);
  }

  /** @override */
  unlayoutCallback() {
    if (this.iframe_) {
      removeElement(this.iframe_);
      this.iframe_ = null;
    }
    if (this.unlistenMessage_) {
      this.unlistenMessage_();
    }
    return true;
  }
}

AMP.extension('amp-permutive', '0.1', AMP => {
  AMP.registerElement('amp-permutive', AmpPermutive);
});
