import { contentFactoryPlugin } from '../console/plugin';

import { editorFactory } from '../../test/src/console/utils';
import { mimeTypeService } from '../../test/src/notebook/utils';
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
    // this.clipboard = options.clipboard;
    let factory = this.contentFactory = options.contentFactory;

    this.layout = new PanelLayout()
    let edOptions = {
      rendermime: this.rendermime,
      contentFactory: factory.editorContentFactory
      // mimeTypeService: options.mimeTypeService
    }
    /**
     * These two calls below are repsonsible for what I am trying to do. 
     * 
     * I need to make a call to the editor constructor and the toolbar constructor
     * and attach those two things to the layout. 
     */
    // this.editor = factory.createEditor(edOptions);
    // let toolbar = factory.createToolbar();
    // layout.addWidget(toolbar)
    // layout.addWidget(this.editor)


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

  readonly contentFactory: EditorPanel.IContentFactory;


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
  }

  /* tslint:disable */
  /**
   * The notebook renderer token.
   */
  // export
  // const IContentFactory = new Token<IContentFactory>('jupyter.services.editor.content-factory');
  /* tslint:enable */

}