// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, KernelMessage
} from '@jupyterlab/services';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  CodeEditor
} from '../codeeditor';

import {
  BaseCellWidget
} from '../notebook/cells/widget';

import {
  RenderMime
} from '../rendermime';

import {
  Inspector
} from './';


/**
 * An object that handles code inspection.
 */
export
class InspectionHandler implements IDisposable, Inspector.IInspectable {
  /**
   * Construct a new inspection handler for a widget.
   */
  constructor(options: InspectionHandler.IOptions) {
    this._kernel = options.kernel || null;
    this._rendermime = options.rendermime;
  }

  /**
   * A signal emitted when the handler is disposed.
   */
  readonly disposed: ISignal<InspectionHandler, void>;

  /**
   * A signal emitted when inspector should clear all items with no history.
   */
  readonly ephemeralCleared: ISignal<InspectionHandler, void>;

  /**
   * A signal emitted when an inspector value is generated.
   */
  readonly inspected: ISignal<InspectionHandler, Inspector.IInspectorUpdate>;

  /**
   * The cell widget used by the inspection handler.
   */
  get activeCell(): BaseCellWidget {
    return this._activeCell;
  }
  set activeCell(newValue: BaseCellWidget) {
    if (newValue === this._activeCell) {
      return;
    }

    if (this._activeCell && !this._activeCell.isDisposed) {
      const editor = this._activeCell.editor;
      editor.model.value.changed.disconnect(this.onTextChanged, this);
    }
    this._activeCell = newValue;
    if (this._activeCell) {
      // Clear ephemeral inspectors in preparation for a new editor.
      this.ephemeralCleared.emit(void 0);
      const editor = this._activeCell.editor;
      editor.model.value.changed.connect(this.onTextChanged, this);
    }
  }

  /**
   * The kernel used by the inspection handler.
   */
  get kernel(): Kernel.IKernel {
    return this._kernel;
  }
  set kernel(value: Kernel.IKernel) {
    this._kernel = value;
  }

  /**
   * Get whether the inspection handler is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources used by the handler.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._activeCell = null;
    this.disposed.emit(void 0);
    clearSignalData(this);
  }

  /**
   * Handle a text changed signal from an editor.
   *
   * #### Notes
   * Update the hints inspector based on a text change.
   */
  protected onTextChanged(): void {
    let update: Inspector.IInspectorUpdate = {
      content: null,
      type: 'hints'
    };

    let editor = this.activeCell.editor;
    let code = editor.model.value.text;
    let position = editor.getCursorPosition();
    let offset = editor.getOffsetAt(position)

    // Clear hints if the new text value is empty or kernel is unavailable.
    if (!code || !this._kernel) {
      this.inspected.emit(update);
      return;
    }

    let contents: KernelMessage.IInspectRequest = {
      code,
      cursor_pos: offset,
      detail_level: 0
    };
    let pending = ++this._pending;

    this._kernel.requestInspect(contents).then(msg => {
      let value = msg.content;

      // If handler has been disposed, bail.
      if (this.isDisposed) {
        this.inspected.emit(update);
        return;
      }

      // If a newer text change has created a pending request, bail.
      if (pending !== this._pending) {
        this.inspected.emit(update);
        return;
      }

      // Hint request failures or negative results fail silently.
      if (value.status !== 'ok' || !value.found) {
        this.inspected.emit(update);
        return;
      }

      let bundle = value.data as RenderMime.MimeMap<string>;
      let trusted = true;
      let widget = this._rendermime.render({ bundle, trusted });
      update.content = widget;
      this.inspected.emit(update);
    });
  }

  private _activeCell: BaseCellWidget = null;
  private _isDisposed = false;
  private _kernel: Kernel.IKernel = null;
  private _pending = 0;
  private _rendermime: RenderMime = null;
}


// Define the signals for the `FileBrowserModel` class.
defineSignal(InspectionHandler.prototype, 'ephemeralCleared');
defineSignal(InspectionHandler.prototype, 'disposed');
defineSignal(InspectionHandler.prototype, 'inspected');


/**
 * A namespace for inspection handler statics.
 */
export
namespace InspectionHandler {
  /**
   * The instantiation options for an inspection handler.
   */
  export
  interface IOptions {
    /**
     * The kernel for the inspection handler.
     */
    kernel?: Kernel.IKernel;

    /**
     * The mime renderer for the inspection handler.
     */
    rendermime: RenderMime;
  }
}
