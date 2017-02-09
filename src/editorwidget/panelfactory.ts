// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  MimeData as IClipboard
} from 'phosphor/lib/core/mimedata';

import { 
  EditorPanel 
} from './panel';

import {
  ABCWidgetFactory, DocumentRegistry
} from '../docregistry';

import {
  RenderMime
} from '../rendermime';

import {
  IEditorMimeTypeService
} from '../codeeditor';

export
class EditorPanelFactory extends ABCWidgetFactory<EditorPanel, DocumentRegistry.ICodeModel> {
  
  /**
   * Constructs a new editor panel factory
   * 
   * @param options - The options used to construct the factory.
   */
  constructor(options: EditorPanelFactory.IOptions) {
    super(options);
    this.rendermime = options.rendermime;
    this.clipboard = options.clipboard;
    this.contentFactory = options.contentFactory;
    this.mimeTypeService = options.mimeTypeService;
  }

  /**
   * The rendermime instance.
   */
  readonly rendermime: RenderMime;

  /**
   * The content factory used by the widget factory. 
   */
  readonly contentFactory: EditorPanel.IContentFactory;

  /**
   * A clipboard instance.
   */
  readonly clipboard: IClipboard;

  /**
   * The service used to look up mime types. 
   */
  readonly mimeTypeService: IEditorMimeTypeService;

  /**
   * Creates a new EditorPanel widget
   */
  protected createNewWidget(context : DocumentRegistry.CodeContext): EditorPanel {
    let rendermime = this.rendermime.clone();
    let panel = new EditorPanel({
      rendermime,
      clipboard: this.clipboard,
      contentFactory: this.contentFactory,
      mimeTypeService: this.mimeTypeService
    });
    panel.context = context;
    return panel;
  } 
}

/**
 * The namespace for 'EditorPanelFactory' statics. 
 */
export
namespace EditorPanelFactory {

  /**
   * The options used to construct a 'EditorPanelFactory'
   */
  export
  interface IOptions extends DocumentRegistry.IWidgetFactoryOptions {
    /**
     * A rendermime instance.
     */
    rendermime: RenderMime;

    /**
     * The content factory used by the widget factory.
     */
    contentFactory: EditorPanel.IContentFactory

    /**
     * A clipboard instance.
     */
    clipboard: IClipboard;

    /**
     * The service used to look up mime types.
     */
    mimeTypeService: IEditorMimeTypeService
  }
}