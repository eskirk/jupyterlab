// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, KernelMessage
} from '@jupyterlab/services';

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  PanelLayout
} from 'phosphor/lib/ui/panel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  IChangedArgs
} from '../../common/interfaces';

import {
  CodeEditor, CodeEditorWidget
} from '../../codeeditor';

import {
  RenderMime
} from '../../rendermime';

import {
  IMetadataCursor
} from '../common/metadata';

import {
  OutputAreaWidget
} from '../output-area';

import {
  ICellModel, ICodeCellModel,
  IMarkdownCellModel, IRawCellModel
} from './model';


/**
 * The class name added to cell widgets.
 */
const CELL_CLASS = 'jp-Cell';

/**
 * The class name added to the prompt area of cell.
 */
const PROMPT_CLASS = 'jp-Cell-prompt';

/**
 * The class name added to input area widgets.
 */
const INPUT_CLASS = 'jp-InputArea';

/**
 * The class name added to the editor area of the cell.
 */
const EDITOR_CLASS = 'jp-InputArea-editor';

/**
 * The class name added to the cell when collapsed.
 */
const COLLAPSED_CLASS = 'jp-mod-collapsed';

/**
 * The class name added to the cell when readonly.
 */
const READONLY_CLASS = 'jp-mod-readOnly';

/**
 * The class name added to code cells.
 */
const CODE_CELL_CLASS = 'jp-CodeCell';

/**
 * The class name added to markdown cells.
 */
const MARKDOWN_CELL_CLASS = 'jp-MarkdownCell';

/**
 * The class name added to rendered markdown output widgets.
 */
const MARKDOWN_OUTPUT_CLASS = 'jp-MarkdownOutput';

/**
 * The class name added to raw cells.
 */
const RAW_CELL_CLASS = 'jp-RawCell';

/**
 * The class name added to cell editor widget nodes.
 */
const CELL_EDITOR_CLASS = 'jp-CellEditor';

/**
 * The class name added to a rendered input area.
 */
const RENDERED_CLASS = 'jp-mod-rendered';

/**
 * The text applied to an empty markdown cell.
 */
const DEFAULT_MARKDOWN_TEXT = 'Type Markdown and LaTeX: $ α^2 $';


/**
 * A base cell widget.
 */
export
class BaseCellWidget extends Widget {
  /**
   * Construct a new base cell widget.
   */
  constructor(options: BaseCellWidget.IOptions) {
    super();
    this.addClass(CELL_CLASS);
    this.layout = new PanelLayout();

    let model = this._model = options.model;
    let renderer = options.renderer;
    this._editor = renderer.createCellEditor(this._model);
    this._editor.addClass(CELL_EDITOR_CLASS);

    this._input = renderer.createInputArea(this._editor);

    (this.layout as PanelLayout).addWidget(this._input);

    // Handle trusted cursor.
    this._trustedCursor = model.getMetadata('trusted');
    this._trusted = !!this._trustedCursor.getValue();

    // Connect signal handlers.
    model.metadataChanged.connect(this.onMetadataChanged, this);
    model.stateChanged.connect(this.onModelStateChanged, this);
  }

  /**
   * Get the prompt node used by the cell.
   */
  get promptNode(): HTMLElement {
    return this._input.promptNode;
  }

  /**
   * Get the editor widget used by the cell.
   */
  get editorWidget(): CodeEditorWidget {
    return this._editor;
  }

  /**
   * Get the editor used by the cell.
   */
  get editor(): CodeEditor.IEditor {
    return this._editor.editor;
  }

  /**
   * Get the model used by the cell.
   */
  get model(): ICellModel {
    return this._model;
  }

  /**
   * The read only state of the cell.
   */
  get readOnly(): boolean {
    return this._readOnly;
  }
  set readOnly(value: boolean) {
    if (value === this._readOnly) {
      return;
    }
    this._readOnly = value;
    this.update();
  }

  /**
   * The trusted state of the cell.
   */
  get trusted(): boolean {
    return this._trusted;
  }
  set trusted(value: boolean) {
    if (!this._model) {
      return;
    }
    this._trustedCursor.setValue(value);
    this._trusted = value;
  }

  /**
   * Set the prompt for the widget.
   */
  setPrompt(value: string): void {
    this._input.setPrompt(value);
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._model = null;
    this._input = null;
    this._editor = null;
    this._trustedCursor = null;
    super.dispose();
  }

  /**
   * Handle `after-attach` messages.
   */
  protected onAfterAttach(msg: Message): void {
    this.update();
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this._editor.editor.focus();
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    if (!this._model) {
      return;
    }
    // Handle read only state.
    this._editor.editor.readOnly = this._readOnly;
    this.toggleClass(READONLY_CLASS, this._readOnly);
  }

  /**
   * Handle changes in the model.
   *
   * #### Notes
   * Subclasses may reimplement this method as needed.
   */
  protected onModelStateChanged(model: ICellModel, args: IChangedArgs<any>): void {
    // no-op
  }

  /**
   * Handle changes in the model.
   */
  protected onMetadataChanged(model: ICellModel, args: IChangedArgs<any>): void {
    switch (args.name) {
      case 'trusted':
        this._trusted = !!this._trustedCursor.getValue();
        this.update();
        break;
      default:
        break;
    }
  }

  /**
   * Render an input instead of the text editor.
   */
  protected renderInput(widget: Widget): void {
    this.addClass(RENDERED_CLASS);
    this._input.renderInput(widget);
  }

  /**
   * Show the text editor.
   */
  protected showEditor(): void {
    this.removeClass(RENDERED_CLASS);
    this._input.showEditor();
  }

  private _input: InputAreaWidget = null;
  private _editor: CodeEditorWidget = null;
  private _model: ICellModel = null;
  private _readOnly = false;
  private _trustedCursor: IMetadataCursor = null;
  private _trusted = false;
}


// Define the signals for the `BaseCellWidget` class.
defineSignal(BaseCellWidget.prototype, 'modelChanged');


/**
 * The namespace for the `BaseCellWidget` class statics.
 */
export
namespace BaseCellWidget {
  /**
   * An options object for initializing a base cell widget.
   */
  export
  interface IOptions {
    /**
     * The model used by the cell.
     */
    model: ICellModel;

    /**
     * A renderer for creating cell widgets.
     *
     * The default is a shared renderer instance.
     */
    renderer: IRenderer;
  }

  /**
   * A renderer for creating cell widgets.
   */
  export
  interface IRenderer {
    /**
     * Create a new cell editor for the widget.
     */
    createCellEditor(model: ICellModel): CodeEditorWidget;

    /**
     * Create a new input area for the widget.
     */
    createInputArea(editor: CodeEditorWidget): InputAreaWidget;
  }

  /**
   * The default implementation of an `IRenderer`.
   */
  export
  class Renderer implements IRenderer {

    /**
     * Creates a new renderer.
     */
    constructor(options: Renderer.IOptions) {
      this._editorFactory = options.editorFactory;
    }

    /**
     * Create a new cell editor for the widget.
     */
    createCellEditor(model: CodeEditor.IModel): CodeEditorWidget {
      return new CodeEditorWidget({ factory: this._editorFactory, model });
    }

    /**
     * Create a new input area for the widget.
     */
    createInputArea(editor: CodeEditorWidget): InputAreaWidget {
      return new InputAreaWidget(editor);
    }

    private _editorFactory: CodeEditor.Factory;
  }

  /**
   * The namespace for the `Renderer` class statics.
   */
  export
  namespace Renderer {
    /**
     * An options object for initializing a renderer.
     */
    export
    interface IOptions {
      /**
       * A code editor factory.
       */
      readonly editorFactory: CodeEditor.Factory;
    }
  }
}


/**
 * A widget for a code cell.
 */
export
class CodeCellWidget extends BaseCellWidget {
  /**
   * Construct a code cell widget.
   */
  constructor(options: CodeCellWidget.IOptions) {
    super(options);
    this.addClass(CODE_CELL_CLASS);
    this._rendermime = options.rendermime;
    this._renderer = options.renderer;

    let renderer = this._renderer;

    if (!this._output) {
      this._output = renderer.createOutputArea(this._rendermime);
      (this.layout as PanelLayout).addWidget(this._output);
    }

    let model = this.model;
    this._output.model = model.outputs;
    this._output.trusted = this.trusted;
    this._collapsedCursor = model.getMetadata('collapsed');
    this._scrolledCursor = model.getMetadata('scrolled');
    this.setPrompt(`${model.executionCount || ''}`);
  }

  /**
   * The model used by the widget.
   */
  readonly model: ICodeCellModel;

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._collapsedCursor = null;
    this._scrolledCursor = null;
    this._output = null;
    super.dispose();
  }

  /**
   * Execute the cell given a kernel.
   */
  execute(kernel: Kernel.IKernel): Promise<KernelMessage.IExecuteReplyMsg> {
    let model = this.model;
    let code = model.value.text;
    if (!code.trim()) {
      model.executionCount = null;
      model.outputs.clear();
      return Promise.resolve(null);
    }
    model.executionCount = null;
    this.setPrompt('*');
    this.trusted = true;
    let outputs = model.outputs;
    return outputs.execute(code, kernel).then(reply => {
      let status = reply.content.status;
      if (status === 'abort') {
        model.executionCount = null;
        this.setPrompt(' ');
      } else {
        model.executionCount = reply.content.execution_count;
      }
      return reply;
    });
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    if (this._collapsedCursor) {
      let value = this._collapsedCursor.getValue() as boolean;
      this.toggleClass(COLLAPSED_CLASS, value);
    }
    if (this._output) {
      // TODO: handle scrolled state.
      this._output.trusted = this.trusted;
    }
    super.onUpdateRequest(msg);
  }

  /**
   * Handle changes in the model.
   */
  protected onModelStateChanged(model: ICellModel, args: IChangedArgs<any>): void {
    switch (args.name) {
    case 'executionCount':
      this.setPrompt(`${(model as ICodeCellModel).executionCount}`);
      break;
    default:
      break;
    }
    super.onModelStateChanged(model, args);
  }

  /**
   * Handle changes in the metadata.
   */
  protected onMetadataChanged(model: ICellModel, args: IChangedArgs<any>): void {
    switch (args.name) {
    case 'collapsed':
    case 'scrolled':
      this.update();
      break;
    default:
      break;
    }
    super.onMetadataChanged(model, args);
  }

  private _renderer: CodeCellWidget.IRenderer;
  private _rendermime: RenderMime = null;
  private _output: OutputAreaWidget = null;
  private _collapsedCursor: IMetadataCursor = null;
  private _scrolledCursor: IMetadataCursor = null;
}


/**
 * The namespace for the `CodeCellWidget` class statics.
 */
export
namespace CodeCellWidget {
  /**
   * An options object for initializing a base cell widget.
   */
  export
  interface IOptions {
    /**
     * The model used by the cell.
     */
    model: ICodeCellModel;

    /**
     * A renderer for creating cell widgets.
     *
     * The default is a shared renderer instance.
     */
    renderer: IRenderer;

    /**
     * The mime renderer for the cell widget.
     */
    rendermime: RenderMime;
  }

  /**
   * A renderer for creating code cell widgets.
   */
  export
  interface IRenderer extends BaseCellWidget.IRenderer {
    /**
     * Create a new output area for the widget.
     */
    createOutputArea(rendermime: RenderMime): OutputAreaWidget;
  }

  /**
   * The default implementation of an `IRenderer`.
   */
  export
  class Renderer extends BaseCellWidget.Renderer implements IRenderer {
    /**
     * Create an output area widget.
     */
    createOutputArea(rendermime: RenderMime): OutputAreaWidget {
      return new OutputAreaWidget({ rendermime });
    }
  }
}


/**
 * A widget for a Markdown cell.
 *
 * #### Notes
 * Things get complicated if we want the rendered text to update
 * any time the text changes, the text editor model changes,
 * or the input area model changes.  We don't support automatically
 * updating the rendered text in all of these cases.
 */
export
class MarkdownCellWidget extends BaseCellWidget {
  /**
   * Construct a Markdown cell widget.
   */
  constructor(options: MarkdownCellWidget.IOptions) {
    super(options);
    this.addClass(MARKDOWN_CELL_CLASS);
    // Insist on the Github-flavored markdown mode.
    this.model.mimeType = 'text/x-ipythongfm';
    this._rendermime = options.rendermime;
  }

  /**
   * The model used by the widget.
   */
  readonly model: IMarkdownCellModel;

  /**
   * Whether the cell is rendered.
   */
  get rendered(): boolean {
    return this._rendered;
  }
  set rendered(value: boolean) {
    if (value === this._rendered) {
      return;
    }
    this._rendered = value;
    this._handleRendered();
  }

  /**
   * Dispose of the resource held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._output = null;
    super.dispose();
  }

  /*
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    // Make sure we are properly rendered.
    this._handleRendered();
    super.onUpdateRequest(msg);
  }

  /**
   * Handle the rendered state.
   */
  private _handleRendered(): void {
    if (!this._rendered) {
      this.showEditor();
    } else {
      this._updateOutput();
      this.renderInput(this._output);
    }
  }

  /**
   * Update the output.
   */
  private _updateOutput(): void {
    let model = this.model;
    let text = model && model.value.text || DEFAULT_MARKDOWN_TEXT;
    let trusted = this.trusted;
    // Do not re-render if the text has not changed and the trusted
    // has not changed.
    if (text !== this._prevText || trusted !== this._prevTrusted) {
      let bundle: RenderMime.MimeMap<string> = { 'text/markdown': text };
      let widget = this._rendermime.render({ bundle, trusted });
      this._output = widget || new Widget();
      this._output.addClass(MARKDOWN_OUTPUT_CLASS);
    }
    this._prevText = text;
    this._prevTrusted = trusted;
  }

  private _rendermime: RenderMime = null;
  private _output: Widget = null;
  private _rendered = true;
  private _prevText = '';
  private _prevTrusted = false;
}


/**
 * The namespace for the `CodeCellWidget` class statics.
 */
export
namespace MarkdownCellWidget {
  /**
   * An options object for initializing a base cell widget.
   */
  export
  interface IOptions {
    /**
     * The model used by the cell.
     */
    model: IMarkdownCellModel;

    /**
     * A renderer for creating cell widgets.
     *
     * The default is a shared renderer instance.
     */
    renderer: BaseCellWidget.IRenderer;

    /**
     * The mime renderer for the cell widget.
     */
    rendermime: RenderMime;
  }
}


/**
 * A widget for a raw cell.
 */
export
class RawCellWidget extends BaseCellWidget {
  /**
   * Construct a raw cell widget.
   */
  constructor(options: BaseCellWidget.IOptions) {
    super(options);
    this.addClass(RAW_CELL_CLASS);
  }

  /**
   * The model used by the widget.
   */
  readonly model: IRawCellModel;
}


/**
 * The namespace for the `RawCellWidget` class statics.
 */
export
namespace RawCellWidget {
  /**
   * An options object for initializing a base cell widget.
   */
  export
  interface IOptions {
    /**
     * The model used by the cell.
     */
    model: IRawCellModel;

    /**
     * A renderer for creating cell widgets.
     *
     * The default is a shared renderer instance.
     */
    renderer: BaseCellWidget.IRenderer;
  }
}


/**
 * An input area widget, which hosts a prompt and an editor widget.
 */
export
class InputAreaWidget extends Widget {
  /**
   * Construct an input area widget.
   */
  constructor(editor: CodeEditorWidget) {
    super();
    this.addClass(INPUT_CLASS);
    editor.addClass(EDITOR_CLASS);
    this.layout = new PanelLayout();
    this._editor = editor;
    let prompt = this._prompt = new Widget();
    prompt.addClass(PROMPT_CLASS);
    let layout = this.layout as PanelLayout;
    layout.addWidget(prompt);
    layout.addWidget(editor);
  }

  /**
   * Get the prompt node used by the cell.
   */
  get promptNode(): HTMLElement {
    return this._prompt.node;
  }

  /**
   * Render an input instead of the text editor.
   */
  renderInput(widget: Widget): void {
    this._editor.hide();
    let layout = this.layout as PanelLayout;
    if (this._rendered) {
      layout.removeWidget(this._rendered);
    }
    this._rendered = widget;
    widget.show();
    layout.addWidget(widget);
  }

  /**
   * Show the text editor.
   */
  showEditor(): void {
    this._editor.show();
    let layout = this.layout as PanelLayout;
    if (this._rendered) {
      layout.removeWidget(this._rendered);
    }
  }

  /**
   * Set the prompt of the input area.
   */
  setPrompt(value: string): void {
    if (value === 'null') {
      value = ' ';
    }
    let text = `In [${value || ' '}]:`;
    this._prompt.node.textContent = text;
  }

  private _prompt: Widget;
  private _editor: CodeEditorWidget;
  private _rendered: Widget;
}
