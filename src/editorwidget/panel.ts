import { EditorWidgetFactory } from '../../lib/editorwidget';
import { EditorWidgetFactory } from './';
import { IDocumentManager } from '../../lib/docmanager';
import { DocumentRegistry, IDocumentRegistry } from '../docregistry';
import { IEditorServices } from '../../lib/codeeditor';
import { IClipboard } from '../clipboard';
import { contentFactoryPlugin } from '../console/plugin';

import { editorFactory } from '../../test/src/console/utils';
import { clipboard, mimeTypeService } from '../../test/src/notebook/utils';
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Toolbar
} from '../toolbar';

import {
  PanelLayout
} from 'phosphor/lib/ui/panel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  RenderMime
} from '../rendermime';

import {
  IEditorMimeTypeService, CodeEditor
} from '../codeeditor';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  EditorWidget, EditorWidgetFactory
} from './widget'


/**
 * The class name to be added to editor panels
 */
const EDITOR_PANEL = 'jp-Editor-panel'


/**
 * A widget that hosts an editor toolbar and content area 
 */
export
class EditorPanel extends Widget {
  /**
   * Constructs a new editor panel
   */
  constructor(options: EditorPanel.IOptions) {
    super();
    this.addClass(EDITOR_PANEL);
    this.rendermime = options.rendermime;
    this.clipboard = options.clipboard;
    let factory = this.contentFactory = options.contentFactory;

    this.layout = new PanelLayout()
    let edOptions = {
      rendermime: this.rendermime,
      contentFactory: factory.editorContentFactory,
      mimeTypeService: options.mimeTypeService
    }
    /**
     * TODO
     * Once all the implementation is squared away, this is how I actually
     * attach a toolbar to the panel
     * I need to make a call to the editor constructor and the toolbar constructor
     * and attach those two things to the layout. 
     * 
     * -Figure out what options object createditor and createtoollbar will take
     * -Implement the functions that create and instantiate the editor and toolbar
     * -Add nested options into the options for toolbar and editor that will then be used a 
     * code edtor and editorwidget down the line
     * PanelFactory -> Panel -> EditorWidget & Toolbar
     */
    let layout = this.layout as PanelLayout;
    this.editor = factory.createEditor(edOptions);
    let toolbar = factory.createToolbar();
    layout.addWidget(toolbar)
    layout.addWidget(this.editor)


  }

  /** 
   * The RenderMime instance used by the widget
   */
  readonly rendermime: RenderMime;

  /**
   * The editor factory
   */
  readonly editorFactory: CodeEditor.Factory;

  /**
   * The editor used by the widget
   */
  readonly editor: EditorWidget;

  /**
   * The content factory for the widget
   */
  readonly contentFactory: EditorPanel.IContentFactory;

  /**
   * The clipboard instance for the widget
   */
  readonly clipboard: IClipboard;

  /**
   * The document context for the widget.
   *
   * #### Notes
   * Changing the context also changes the model on the
   * `content`.
   */
  get context(): DocumentRegistry.IContext<DocumentRegistry.ICodeModel> {
    return this._context;
  }
  set context(newValue: DocumentRegistry.IContext<DocumentRegistry.ICodeModel>) {
    newValue = newValue || null;
    if (newValue === this._context) {
      return;
    }
    let oldValue = this._context;
    this._context = newValue;
    this.rendermime.resolver = newValue;
    // Trigger private, protexted, and public changes.
    // TODO
    // this._onContextChanged(oldValue, newValue);
    // this.onContextChanged(oldValue, newValue);
    // this.contextChanged.emit(void 0);
  }

  private _context: DocumentRegistry.IContext<DocumentRegistry.ICodeModel> = null;


}

export namespace EditorPanel {
  /**
   * Options interface for Editor Pane
   */
  export 
  interface IOptions {
    /** 
     * The rendermime instance used by the panel
     */
    rendermime: RenderMime;

    /**
     * The content factory for the panel
     */
    contentFactory: IContentFactory;

    /**
     * The clipboard instance used by the widget
     */
    clipboard: IClipboard;

    /**
     * The service used to look up mime types.
     */
    mimeTypeService: IEditorMimeTypeService
  }

  export
  interface IContentFactory {

    /**
     * The content factory for an EditorWidget
     */
    readonly editorContentFactory: EditorWidgetFactory

    //  /**
    //  * The editor factory.
    //  */
    // readonly editorFactory: EditorWidget.EditorWidgetFactory;

    /**
     * Create a new toolbar for the panel
     */
    createToolbar(): Toolbar<Widget>;

    /**
     * Create a new editor widget for the panel
     */
    createEditor(options: EditorWidget.IOptions): EditorWidget;

  
}

  /**
   * The notebook renderer token.
   */
  // export
  // const IContentFactory = new Token<IContentFactory>('jupyter.services.editor.content-factory');


  /**
   * The default implementation of an `IContentFactory`.
   */
  export
  class ContentFactory implements IContentFactory {
    /**
     * Creates a new renderer.
     */
    constructor(options: ContentFactory.IOptions) {
      this.editorFactory = options.editorFactory;
      /**
       * TODO
       * Ask Bryan how to correctly implement a content factory like this 
       */
      this.editorContentFactory = (options.editorFactory ||
        new EditorPanel.ContentFactory({
          editorFactory: this.editorContentFactory,
          editorContentFactory: this.editorContentFactory,
          mimeTypeService: this.mimeTypeService
        })
      );
    }

    /**
     * The editor factory.
     */
    readonly editorFactory: EditorWidgetFactory;

    /**
     * The content factory for an EditorWidget
     */
    readonly editorContentFactory: EditorWidgetFactory;

    /**
     * The service used to look up mime types.
     */
    readonly mimeTypeService: IEditorMimeTypeService;

    /**
     * Create a new toolbar for the panel.
     */
    createToolbar(): Toolbar<Widget> {
      return new Toolbar();
    }

    /**
     * Create a new editor 
     */
    createEditor(options: EditorWidget.IOptions): EditorWidget {
      return new EditorWidget(options);
    }
   }

   /**
   * The namespace for `ContentFactory`.
   */
  export
  namespace ContentFactory {
    /**
     * An initialization options for a notebook panel content factory.
     */
    export
    interface IOptions {
      /**
       * The editor factory.
       */
      editorFactory: EditorWidgetFactory;

      /**
      * The content factory for an EditorWidget
      */
      editorContentFactory: EditorWidgetFactory

      /**
      * The service used to look up mime types.
      */
      mimeTypeService: IEditorMimeTypeService

    }
  }
}