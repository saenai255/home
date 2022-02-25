/* extension.js
 *
 * BSD 2-Clause License
 * 
 * Copyright (c) 2014, 2018, Andreas Fuchs
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * 
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * SPDX-License-Identifier: BSD-2-Clause
 */

/* exported init */

const GETTEXT_DOMAIN = "audio-output-switcher@anduchs";

const { GObject, St } = imports.gi;

const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;

const AudioOutputSubMenu = GObject.registerClass(
  class AudioOutputSubMenu extends PopupMenu.PopupSubMenuMenuItem {
    _init() {
      super._init("Audio Output: Connecting...", true);
      this._control = Main.panel.statusArea.aggregateMenu._volume._control;

      this._controlSignal = this._control.connect(
        "default-sink-changed",
        () => {
          if (this._updateDefaultSink) {
            this._updateDefaultSink();
          }
        }
      );
      if (this._updateDefaultSink) {
        this._updateDefaultSink();
      }
      this.menu.connect("open-state-changed", (menu, isOpen) => {
        if (isOpen) {
          this._updateSinkList();
        }
      });

      //Unless there is at least one item here, no 'open' will be emitted...
      let item = new PopupMenu.PopupMenuItem("Connecting...");
      this.menu.addMenuItem(item);
    }

    _updateDefaultSink() {
      let defaultSink = this._control.get_default_sink();
      //Unfortunately, Gvc neglects some pulse-devices, such as all "Monitor of ..."
      if (!defaultSink) {
        this.label.set_text("Other");
      } else {
        this.label.set_text(defaultSink.get_description());
      }
    }

    _updateSinkList() {
      this.menu.removeAll();

      let defaultSink = this._control.get_default_sink();
      let sinkList = this._control.get_sinks();
      let control = this._control;

      for (let i = 0; i < sinkList.length; i++) {
        let sink = sinkList[i];
        if (sink === defaultSink) continue;
        let item = new PopupMenu.PopupMenuItem(sink.get_description());
        item.connect("activate", () => {
          control.set_default_sink(sink);
        });
        this.menu.addMenuItem(item);
      }
      if (
        sinkList.length == 0 ||
        (sinkList.length == 1 && sinkList[0] === defaultSink)
      ) {
        let item = new PopupMenu.PopupMenuItem("No more Devices");
        this.menu.addMenuItem(item);
      }
    }

    destroy() {
      this._control.disconnect(this._controlSignal);
      super.destroy();
    }
  }
);

class Extension {
  constructor(uuid) {
    this._uuid = uuid;

    ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
  }

  enable() {
    this._menu = new AudioOutputSubMenu();

    // Try to add the output-switcher right below the output slider...
    const volumeMenu = Main.panel.statusArea.aggregateMenu._volume._volumeMenu;
    let items = volumeMenu._getMenuItems();
    let i = 0;
    while (i < items.length) {
      if (items[i] === volumeMenu._output.item) {
        break;
      }
      i++;
    }
    volumeMenu.addMenuItem(this._menu, i + 1);
  }

  disable() {
    this._menu.destroy();
    this._menu = null;
  }
}

function init(meta) {
  return new Extension(meta.uuid);
}
