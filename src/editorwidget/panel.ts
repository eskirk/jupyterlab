// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDocumentManager } from '../../lib/docmanager';
import { IDocumentRegistry } from '../docregistry';
import { Panel, PanelLayout } from 'phosphor/lib/ui/panel';
import { IBuildOptions } from '@jupyterlab/extension-builder/lib';
import { contentFactoryPlugin } from '../notebook/plugin';
import { EditorWidget, EditorWidgetFactory } from './';
import { Widget } from 'phosphor/lib/ui/widget';
import {
  Toolbar
} from '../toolbar';

const ED_PANEL = 'jp-Editor-panel';

export
class EditorPanel extends Widget {

    constructor(options: EditorPanel.IOptions) {
        super();
        this.addClass(ED_PANEL)

        this.widgetFactory = new EditorWidgetFactory(options.widgetFactoryOptions);
        this.contentFactory = new EditorPanel.ContentFactory({});
        let layout = this.layout = new PanelLayout();

        this.editorWidget = this.contentFactory.createEditor()
        layout.addWidget(this.contentFactory.createToolbar());
        layout.addWidget(this.editorWidget);
    }

    readonly widgetFactory: EditorWidgetFactory;

    readonly contentFactory: EditorPanel.ContentFactory;

    readonly editorWidget: EditorWidget;
}

export namespace EditorPanel {

    export
    interface IOptions {

        widgetFactoryOptions: EditorWidgetFactory.IOptions;

        registry: IDocumentRegistry;

        // TODO
        // Pass a CodeContext instance to these options so I can make an editorwidget
        // codeContext: DocumentRegistry.CodeContext;
    }

    export
    interface IContentFactory {
        createToolbar(): Toolbar<Widget>;

        createEditor(): EditorWidget;
    }

    export
    class ContentFactory implements IContentFactory {
        constructor(options: ContentFactory.IOptions) {

        }

        createToolbar(): Toolbar<Widget> {
            return new Toolbar();
        }

        createEditor(): EditorWidget {
            // return new EditorWidget();
            return null;
        }
    }

    export
    namespace ContentFactory {

        export
        interface IOptions {
            
            // TODO
            // figure out how to get these here
            editorOptions: EditorWidget.IOptions;
        }
    }
}