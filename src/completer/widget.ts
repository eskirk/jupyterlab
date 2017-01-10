// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IIterator, IterableOrArrayLike, toArray
} from 'phosphor/lib/algorithm/iteration';

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  scrollIntoViewIfNeeded
} from 'phosphor/lib/dom/query';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  CodeEditor
} from '../codeeditor';


/**
 * The class name added to completer menu widgets.
 */
const COMPLETER_CLASS = 'jp-Completer';

/**
 * The class name added to completer menu items.
 */
const ITEM_CLASS = 'jp-Completer-item';

/**
 * The class name added to an active completer menu item.
 */
const ACTIVE_CLASS = 'jp-mod-active';

/**
 * The class name added to a completer widget that is scrolled out of view.
 */
const OUTOFVIEW_CLASS = 'jp-mod-outofview';

/**
 * The minimum height of a completer widget.
 */
const MIN_HEIGHT = 20;

/**
 * The maximum height of a completer widget.
 *
 * #### Notes
 * This value is only used if a CSS max-height attribute is not set for the
 * completer. It is a fallback value.
 */
const MAX_HEIGHT = 200;

/**
 * A flag to indicate that event handlers are caught in the capture phase.
 */
const USE_CAPTURE = true;


/**
 * A widget that enables text completion.
 */
export
class CompleterWidget extends Widget {
  /**
   * Construct a text completer menu widget.
   */
  constructor(options: CompleterWidget.IOptions = {}) {
    super({ node: document.createElement('ul') });
    this._renderer = options.renderer || CompleterWidget.defaultRenderer;
    this.anchor = options.anchor || null;
    this.model = options.model || null;
    this.addClass(COMPLETER_CLASS);

    // Completer widgets are hidden until they are populated.
    this.hide();
  }

  /**
   * A signal emitted when a selection is made from the completer menu.
   */
  readonly selected: ISignal<this, string>;

  /**
   * A signal emitted when the completer widget's visibility changes.
   *
   * #### Notes
   * This signal is useful when there are multiple floating widgets that may
   * contend with the same space and ought to be mutually exclusive.
   */
  readonly visibilityChanged: ISignal<this, void>;

  /**
   * The model used by the completer widget.
   */
  get model(): CompleterWidget.IModel {
    return this._model;
  }
  set model(model: CompleterWidget.IModel) {
    if (!model && !this._model || model === this._model) {
      return;
    }
    if (this._model) {
      this._model.stateChanged.disconnect(this.onModelStateChanged, this);
    }
    this._model = model;
    if (this._model) {
      this._model.stateChanged.connect(this.onModelStateChanged, this);
    }
  }

  /**
   * The semantic parent of the completer widget, its anchor element. An
   * event listener will peg the position of the completer widget to the
   * anchor element's scroll position. Other event listeners will guarantee
   * the completer widget behaves like a child of the reference element even
   * if it does not appear as a descendant in the DOM.
   */
  get anchor(): HTMLElement {
    return this._anchor;
  }
  set anchor(element: HTMLElement) {
    if (this._anchor === element) {
      return;
    }
    // Clean up scroll listener if anchor is being replaced.
    if (this._anchor) {
      this._anchor.removeEventListener('scroll', this, USE_CAPTURE);
    }

    this._anchor = element;

    // Add scroll listener to anchor element.
    if (this._anchor) {
      this._anchor.addEventListener('scroll', this, USE_CAPTURE);
    }
  }

  /**
   * Dispose of the resources held by the completer widget.
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._model = null;
    super.dispose();
  }

  /**
   * Reset the widget.
   */
  reset(): void {
    this._reset();
    if (this._model) {
      this._model.reset();
    }
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the dock panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    if (this.isHidden || !this._anchor) {
      return;
    }
    switch (event.type) {
    case 'keydown':
      this._evtKeydown(event as KeyboardEvent);
      break;
    case 'mousedown':
      this._evtMousedown(event as MouseEvent);
      break;
    case 'scroll':
      this._evtScroll(event as MouseEvent);
      break;
    default:
      break;
    }
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    document.addEventListener('keydown', this, USE_CAPTURE);
    document.addEventListener('mousedown', this, USE_CAPTURE);
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    document.removeEventListener('keydown', this, USE_CAPTURE);
    document.removeEventListener('mousedown', this, USE_CAPTURE);

    if (this._anchor) {
      this._anchor.removeEventListener('scroll', this, USE_CAPTURE);
    }
  }

  /**
   * Handle model state changes.
   */
  protected onModelStateChanged(): void {
    if (this.isAttached) {
      this.update();
    }
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    let model = this._model;
    let anchor = this._anchor;
    if (!model || !anchor) {
      return;
    }

    let items = toArray(model.items());

    // If there are no items, reset and bail.
    if (!items || !items.length) {
      this._reset();
      if (!this.isHidden) {
        this.hide();
        this.visibilityChanged.emit(void 0);
      }
      return;
    }

    // If there is only one item, signal and bail.
    if (items.length === 1) {
      this.selected.emit(items[0].raw);
      this.reset();
      return;
    }

    // Clear the node.
    let node = this.node;
    node.textContent = '';

    // Populate the completer items.
    for (let item of items) {
      let li = this._renderer.createItemNode(item);
      // Set the raw, un-marked up value as a data attribute.
      li.setAttribute('data-value', item.raw);
      node.appendChild(li);
    }

    let active = node.querySelectorAll(`.${ITEM_CLASS}`)[this._activeIndex];
    active.classList.add(ACTIVE_CLASS);

    if (this.isHidden) {
      this.show();
      this.visibilityChanged.emit(void 0);
    }
    this._anchorPoint = anchor.scrollTop;
    this._setGeometry();

    // If this is the first time the current completer session has loaded,
    // populate any initial subset match.
    if (this._model.subsetMatch) {
      this._populateSubset();
      this.model.subsetMatch = false;
    }
  }

  /**
   * Cycle through the available completer items.
   */
  private _cycle(direction: 'up' | 'down'): void {
    let items = this.node.querySelectorAll(`.${ITEM_CLASS}`);
    let index = this._activeIndex;
    let active = this.node.querySelector(`.${ACTIVE_CLASS}`) as HTMLElement;
    active.classList.remove(ACTIVE_CLASS);
    if (direction === 'up') {
      this._activeIndex = index === 0 ? items.length - 1 : index - 1;
    } else {
      this._activeIndex = index < items.length - 1 ? index + 1 : 0;
    }
    active = items[this._activeIndex] as HTMLElement;
    active.classList.add(ACTIVE_CLASS);
    scrollIntoViewIfNeeded(this.node, active);
  }

  /**
   * Handle keydown events for the widget.
   */
  private _evtKeydown(event: KeyboardEvent) {
    if (this.isHidden || !this._anchor) {
      return;
    }
    let target = event.target as HTMLElement;
    while (target !== document.documentElement) {
      if (target === this._anchor) {
        switch (event.keyCode) {
          case 9:  // Tab key
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            this._model.subsetMatch = true;
            let populated = this._populateSubset();
            this.model.subsetMatch = false;
            if (populated) {
              return;
            }
            this._selectActive();
            return;
          case 13: // Enter key
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            this._selectActive();
            return;
          case 27: // Esc key
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            this.reset();
            return;
          case 38: // Up arrow key
          case 40: // Down arrow key
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            this._cycle(event.keyCode === 38 ? 'up' : 'down');
            return;
          default:
            return;
        }
      }
      target = target.parentElement;
    }
    this.reset();
  }

  /**
   * Handle mousedown events for the widget.
   */
  private _evtMousedown(event: MouseEvent) {
    if (this.isHidden || !this._anchor) {
      return;
    }
    if (Private.nonstandardClick(event)) {
      this.reset();
      return;
    }

    let target = event.target as HTMLElement;
    while (target !== document.documentElement) {
      // If the user has made a selection, emit its value and reset the widget.
      if (target.classList.contains(ITEM_CLASS)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.selected.emit(target.getAttribute('data-value'));
        this.reset();
        return;
      }
      // If the mouse event happened anywhere else in the widget, bail.
      if (target === this.node) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }
      target = target.parentElement;
    }
    this.reset();
  }

  /**
   * Handle scroll events for the widget
   */
  private _evtScroll(event: MouseEvent) {
    if (this.isHidden || !this._anchor) {
      return;
    }
    this._setGeometry();
  }

  /**
   * Populate the completer up to the longest initial subset of items.
   *
   * @returns `true` if a subset match was found and populated.
   */
  private _populateSubset(): boolean {
    let items = this.node.querySelectorAll(`.${ITEM_CLASS}`);
    let subset = Private.commonSubset(Private.itemValues(items));
    let query = this.model.query;
    if (subset && subset !== query && subset.indexOf(query) === 0) {
      this.model.query = subset;
      this.selected.emit(subset);
      this.update();
      return true;
    }
    return false;
  }

  /**
   * Reset the internal flags to defaults.
   */
  private _reset(): void {
    this._activeIndex = 0;
    this._anchorPoint = 0;
  }

  /**
   * Set the visible dimensions of the widget.
   */
  private _setGeometry(): void {
    let node = this.node;
    let model = this._model;

    // This is an overly defensive test: `cursor` will always exist if
    // `original` exists, except in contrived tests. But since it is possible
    // to generate a runtime error, the check occurs here.
    if (!model || !model.original || !model.cursor) {
      return;
    }

    // Clear any previously set max-height.
    node.style.maxHeight = '';

    // Clear any programmatically set margin-top.
    node.style.marginTop = '';

    // Make sure the node is visible.
    node.classList.remove(OUTOFVIEW_CLASS);

    // Always use the original coordinates to calculate completer position.
    let { coords, charWidth, lineHeight } = model.original;
    let style = window.getComputedStyle(node);
    let innerHeight = window.innerHeight;
    let scrollDelta = this._anchorPoint - this._anchor.scrollTop;
    let spaceAbove = coords.top + scrollDelta;
    let spaceBelow = innerHeight - coords.bottom - scrollDelta;
    let marginTop = parseInt(style.marginTop, 10) || 0;
    let maxHeight = parseInt(style.maxHeight, 10) || MAX_HEIGHT;
    let minHeight = parseInt(style.minHeight, 10) || MIN_HEIGHT;
    let anchorRect = this._anchor.getBoundingClientRect();
    let top: number;

    // If the whole completer fits below or if there is more space below, then
    // rendering the completer below the text being typed is privileged so that
    // the code above is not obscured.
    let renderBelow = spaceBelow >= maxHeight || spaceBelow >= spaceAbove;
    if (renderBelow) {
      maxHeight = Math.min(spaceBelow - marginTop, maxHeight);
    } else {
      maxHeight = Math.min(spaceAbove, maxHeight);
      // If the completer renders above the text, its top margin is irrelevant.
      node.style.marginTop = '0px';
    }
    node.style.maxHeight = `${maxHeight}px`;

    // Make sure the completer ought to be visible.
    let withinBounds = maxHeight > minHeight &&
                       spaceBelow >= lineHeight &&
                       spaceAbove >= anchorRect.top;
    if (!withinBounds) {
      node.classList.add(OUTOFVIEW_CLASS);
      return;
    }

    let borderLeftWidth = style.borderLeftWidth;
    let left = coords.left + (parseInt(borderLeftWidth, 10) || 0);
    let { start, end } = this._model.cursor;
    let nodeRect = node.getBoundingClientRect();

    // Position the completer vertically.
    top = renderBelow ? innerHeight - spaceBelow : spaceAbove - nodeRect.height;
    node.style.top = `${Math.floor(top)}px`;

    // Move completer to the start of the blob being completed.
    left -= charWidth * (end - start);
    node.style.left = `${Math.ceil(left)}px`;
    node.style.width = 'auto';

    // Expand the menu width by the scrollbar size, if present.
    if (node.scrollHeight >= maxHeight) {
      node.style.width = `${2 * node.offsetWidth - node.clientWidth}px`;
      node.scrollTop = 0;
    }
  }

  /**
   * Emit the selected signal for the current active item and reset.
   */
  private _selectActive(): void {
    let active = this.node.querySelector(`.${ACTIVE_CLASS}`) as HTMLElement;
    if (!active) {
      this._reset();
      return;
    }
    this.selected.emit(active.getAttribute('data-value'));
    this.reset();
  }

  private _anchor: HTMLElement = null;
  private _anchorPoint = 0;
  private _activeIndex = 0;
  private _model: CompleterWidget.IModel = null;
  private _renderer: CompleterWidget.IRenderer = null;
}


// Define the signals for the `CompleterWidget` class.
defineSignal(CompleterWidget.prototype, 'selected');
defineSignal(CompleterWidget.prototype, 'visibilityChanged');


export
namespace CompleterWidget {
  /**
   * The initialization options for a completer widget.
   */
  export
  interface IOptions {
    /**
     * The semantic parent of the completer widget, its anchor element. An
     * event listener will peg the position of the completer widget to the
     * anchor element's scroll position. Other event listeners will guarantee
     * the completer widget behaves like a child of the reference element even
     * if it does not appear as a descendant in the DOM.
     */
    anchor?: HTMLElement;

    /**
     * The model for the completer widget.
     */
    model?: IModel;

    /**
     * The renderer for the completer widget nodes.
     */
    renderer?: IRenderer;
  }

  /**
   * An interface describing editor state coordinates.
   */
  export interface ICoordinate extends CodeEditor.ICoordinate, JSONObject { }


  /**
   * An interface for a completion request.
   */
  export
  interface ITextState extends JSONObject {
    /**
     * The current line of text.
     */
    readonly text: string;

    /**
     * The height of a character in the editor.
     */
    readonly lineHeight: number;

    /**
     * The width of a character in the editor.
     */
    readonly charWidth: number;

    /**
     * The line number of the editor cursor.
     */
    readonly line: number;

    /**
     * The character number of the editor cursor within a line.
     */
    readonly column: number;

    /**
     * The coordinate position of the cursor.
     */
    readonly coords: ICoordinate;
  }

  /**
   * The data model backing a code completer widget.
   */
  export
  interface IModel extends IDisposable {
    /**
     * A signal emitted when state of the completer menu changes.
     */
    readonly stateChanged: ISignal<IModel, void>;

    /**
     * The current text state details.
     */
    current: ITextState;

    /**
     * The cursor details that the API has used to return matching options.
     */
    cursor: ICursorSpan;

    /**
     * A flag that is true when the model value was modified by a subset match.
     */
    subsetMatch: boolean;

    /**
     * The original completer request details.
     */
    original: ITextState;

    /**
     * The query against which items are filtered.
     */
    query: string;

    /**
     * Get the of visible items in the completer menu.
     */
    items(): IIterator<IItem>;

    /**
     * Get the unfiltered options in a completer menu.
     */
    options(): IIterator<string>;

    /**
     * Set the avilable options in the completer menu.
     */
    setOptions(options: IterableOrArrayLike<string>): void;

    /**
     * Handle a completion request.
     */
    handleTextChange(change: CompleterWidget.ITextState): void;

    /**
     * Create a resolved patch between the original state and a patch string.
     */
    createPatch(patch: string): IPatch;

    /**
     * Reset the state of the model.
     */
    reset(): void;
  }

  /**
   * An object describing a completion option injection into text.
   */
  export
  interface IPatch {
    /**
     * The patch text.
     */
    text: string;

    /**
     * The position in the text where cursor should be after patch application.
     */
    position: number;
  }


  /**
   * A completer menu item.
   */
  export
  interface IItem {
    /**
     * The highlighted, marked up text of a visible completer item.
     */
    text: string;

    /**
     * The raw text of a visible completer item.
     */
    raw: string;
  }


  /**
   * A cursor span.
   */
  export
  interface ICursorSpan extends JSONObject {
    /**
     * The start position of the cursor.
     */
    start: number;

    /**
     * The end position of the cursor.
     */
    end: number;
  }

  /**
   * A renderer for completer widget nodes.
   */
  export
  interface IRenderer {
    /**
     * Create an item node (an `li` element) for a text completer menu.
     */
    createItemNode(item: IItem): HTMLLIElement;
  }

  /**
   * The default implementation of an `IRenderer`.
   */
  export
  class Renderer implements IRenderer {
    /**
     * Create an item node for a text completer menu.
     */
    createItemNode(item: IItem): HTMLLIElement {
      let li = document.createElement('li');
      let code = document.createElement('code');

      // Use innerHTML because search results include <mark> tags.
      code.innerHTML = item.text;

      li.className = ITEM_CLASS;
      li.appendChild(code);
      return li;
    }
  }

  /**
   * The default `IRenderer` instance.
   */
  export
  const defaultRenderer = new Renderer();
}


/**
 * A namespace for completer widget private data.
 */
namespace Private {
  /**
   * Returns the common subset string that a list of strings shares.
   */
  export
  function commonSubset(values: string[]): string {
    let len = values.length;
    let subset = '';
    if (len < 2) {
      return subset;
    }
    let strlen = values[0].length;
    for (let i = 0; i < strlen; i++) {
      let ch = values[0][i];
      for (let j = 1; j < len; j++) {
        if (values[j][i] !== ch) {
          return subset;
        }
      }
      subset += ch;
    }
    return subset;
  }

  /**
   * Returns the list of raw item values currently in the DOM.
   */
  export
  function itemValues(items: NodeList): string[] {
    let values: string[] = [];
    for (let i = 0, len = items.length; i < len; i++) {
      values.push((items[i] as HTMLElement).getAttribute('data-value'));
    }
    return values;
  }

  /**
   * Returns true for any modified click event (i.e., not a left-click).
   */
  export
  function nonstandardClick(event: MouseEvent): boolean {
    return event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.metaKey;
  }
}
