import { IDocumentManager } from '../docmanager';
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  InstanceTracker, JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IEditorServices
} from '../codeeditor';

import {
  IDocumentRegistry
} from '../docregistry';

import {
  CommandIDs as FileBrowserCommandIDs
} from '../filebrowser';

import {
  IInstanceRestorer
} from '../instancerestorer';

import {
  IEditorTracker, EditorWidget, EditorWidgetFactory, CommandIDs, addDefaultCommands
} from './';

import {
  EditorPanel
} from './panel';

import {
  DocumentRegistry
} from '../docregistry';


/**
 * The class name for all main area portrait tab icons.
 */
const PORTRAIT_ICON_CLASS = 'jp-MainAreaPortraitIcon';

/**
 * The class name for the text editor icon from the default theme.
 */
const EDITOR_ICON_CLASS = 'jp-ImageTextEditor';

/**
 * The name of the factory that creates editor widgets.
 */
const FACTORY = 'Editor';


/**
 * The editor tracker extension.
 */
const plugin: JupyterLabPlugin<IEditorTracker> = {
  activate,
  id: 'jupyter.services.editor-tracker',
  requires: [IDocumentRegistry, IInstanceRestorer, IEditorServices],
  provides: IEditorTracker,
  autoStart: true
};

/**
 * Export the plugins as default.
 */
export default plugin;


/**
 * Activate the editor tracker plugin.
 */
function activate(app: JupyterLab, registry: IDocumentRegistry, restorer: IInstanceRestorer, editorServices: IEditorServices): IEditorTracker {
  const factory = new EditorWidgetFactory({
    editorServices,
    factoryOptions: {
      name: FACTORY,
      fileExtensions: ['*'],
      defaultFor: ['*']
    }
  });
  const shell = app.shell;
  const tracker = new InstanceTracker<EditorWidget>({
    namespace: 'editor',
    shell
  });
  
  // TODO
  const panelFactory = new EditorPanel({
    widgetFactoryOptions: {
      editorServices,
      factoryOptions: {
        name: FACTORY,
        fileExtensions: ['*'],
        defaultFor: ['*']
      }
    },
    registry
  });

  // Handle state restoration.
  restorer.restore(tracker, {
    command: FileBrowserCommandIDs.open,
    args: widget => ({ path: widget.context.path, factory: FACTORY }),
    name: widget => widget.context.path
  });

  factory.widgetCreated.connect((sender, widget) => {
    widget.title.icon = `${PORTRAIT_ICON_CLASS} ${EDITOR_ICON_CLASS}`;
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => { tracker.save(widget); });
    tracker.add(widget);
  });
  registry.addWidgetFactory(factory);

  addDefaultCommands(tracker, app.commands);
  return tracker;
}
