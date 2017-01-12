// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  each
} from 'phosphor/lib/algorithm/iteration';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  AttachedProperty
} from 'phosphor/lib/core/properties';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  CommandRegistry
} from 'phosphor/lib/ui/commandregistry';

import {
  FocusTracker
} from 'phosphor/lib/ui/focustracker';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  IInstanceRestorer
} from '../instancerestorer';

import {
  IStateDB
} from '../statedb';


/**
 * An object that tracks widget instances.
 */
export
interface IInstanceTracker<T extends Widget> {
  /**
   * A signal emitted when the current widget changes.
   *
   * #### Notes
   * If the last widget being tracked is disposed, `null` will be emitted.
   */
  readonly currentChanged: ISignal<this, T>;

  /**
   * The current widget is the most recently focused widget.
   */
  readonly currentWidget: T;

  /**
   * The number of widgets held by the tracker.
   */
  readonly size: number;

  /**
   * Iterate through each widget in the tracker.
   *
   * @param fn - The function to call on each widget.
   */
  forEach(fn: (widget: T) => void): void;

  /**
   * Inject a foreign widget into the instance tracker.
   *
   * @param widget - The widget to inject into the tracker.
   *
   * #### Notes
   * Any widgets injected into an instance tracker will not have their state
   * saved by the tracker. The primary use case for widget injection is for a
   * plugin that offers a sub-class of an extant plugin to have its instances
   * share the same commands as the parent plugin (since most relevant commands
   * will use the `currentWidget` of the parent plugin's instance tracker). In
   * this situation, the sub-class plugin may well have its own instance tracker
   * for layout and state restoration in addition to injecting its widgets into
   * the parent plugin's instance tracker.
   */
  inject(widget: T): void;
}


/**
 * A class that keeps track of widget instances.
 *
 * #### Notes
 * The API surface area of this concrete implementation is substantially larger
 * than the instance tracker interface it implements. The interface is intended
 * for export by JupyterLab plugins that create widgets and have clients who may
 * wish to keep track of newly created widgets. This class, however, can be used
 * internally by plugins to restore state as well.
 */
export
class InstanceTracker<T extends Widget> implements IInstanceTracker<T>, IDisposable {
  /**
   * Create a new instance tracker.
   *
   * @param options - The instantiation options for an instance tracker.
   */
  constructor(options: InstanceTracker.IOptions) {
    this.namespace = options.namespace;
    this._tracker.currentChanged.connect(this._onCurrentChanged, this);
  }

  /**
   * A namespace for all tracked widgets, (e.g., `notebook`).
   */
  readonly namespace: string;

  /**
   * A signal emitted when the current widget changes.
   */
  readonly currentChanged: ISignal<this, T>;

  /**
   * The current widget is the most recently focused widget.
   */
  get currentWidget(): T {
    return this._tracker.currentWidget;
  }

  /**
   * Test whether the tracker is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * The number of widgets held by the tracker.
   */
  get size(): number {
    return this._tracker.widgets.length;
  }

  /**
   * Add a new widget to the tracker.
   *
   * @param widget - The widget being added.
   */
  add(widget: T): Promise<void> {
    if (this._tracker.has(widget)) {
      let warning = `${widget.id} already exists in the tracker.`;
      console.warn(warning);
      return Promise.reject(warning);
    }
    this._tracker.add(widget);

    let injected = Private.injectedProperty.get(widget);
    let promise: Promise<void>;

    // Handle widget state restoration.
    if (!injected && this._restore) {
      let { restorer, state } = this._restore;
      let widgetName = this._restore.name(widget);

      widget.disposed.connect(this._onWidgetDisposed, this);
      if (widgetName) {
        let name = `${this.namespace}:${widgetName}`;
        let data = this._restore.args(widget);

        Private.nameProperty.set(widget, name);
        promise = state.save(name, { data });

        if (restorer) {
          restorer.add(widget, name);
        }
      }
    }

    return promise || Promise.resolve(void 0);
  }

  /**
   * Dispose of the resources held by the tracker.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    clearSignalData(this);
  }

  /**
   * Find the first widget in the tracker that satisfies a filter function.
   *
   * @param - fn The filter function to call on each widget.
   */
  find(fn: (widget: T) => boolean): T {
    let result: T = null;
    each(this._tracker.widgets, widget => {
      // If a result has already been found, short circuit.
      if (result) {
        return;
      }
      if (fn(widget)) {
        result = widget;
      }
    });
    return result;
  }

  /**
   * Iterate through each widget in the tracker.
   *
   * @param fn - The function to call on each widget.
   */
  forEach(fn: (widget: T) => void): void {
    each(this._tracker.widgets, widget => { fn(widget); });
  }

  /**
   * Inject a foreign widget into the instance tracker.
   *
   * @param widget - The widget to inject into the tracker.
   *
   * #### Notes
   * Any widgets injected into an instance tracker will not have their state
   * saved by the tracker. The primary use case for widget injection is for a
   * plugin that offers a sub-class of an extant plugin to have its instances
   * share the same commands as the parent plugin (since most relevant commands
   * will use the `currentWidget` of the parent plugin's instance tracker). In
   * this situation, the sub-class plugin may well have its own instance tracker
   * for layout and state restoration in addition to injecting its widgets into
   * the parent plugin's instance tracker.
   */
  inject(widget: T): void {
    Private.injectedProperty.set(widget, true);
    this.add(widget);
  }

  /**
   * Check if this tracker has the specified widget.
   *
   * @param widget - The widget whose existence is being checked.
   */
  has(widget: Widget): boolean {
    return this._tracker.has(widget as any);
  }

  /**
   * Restore the widgets in this tracker's namespace.
   *
   * @param options - The configuration options that describe restoration.
   *
   * @returns A promise that resolves when restoration has completed.
   *
   * #### Notes
   * This function should almost never be invoked by client code. Its primary
   * use case is to be invoked by an instance restorer plugin that handles
   * multiple instance trackers and, when ready, asks them each to restore their
   * respective widgets.
   */
  restore(options: InstanceTracker.IRestoreOptions<T>): Promise<any> {
    this._restore = options;

    let { command, registry, state, when } = options;
    let namespace = this.namespace;
    let promises = [state.fetchNamespace(namespace)];

    if (when) {
      promises = promises.concat(when);
    }

    return Promise.all(promises).then(([saved]) => {
      return Promise.all(saved.map(item => {
        let args = (item.value as any).data;
        // Execute the command and if it fails, delete the state restore data.
        return registry.execute(command, args)
          .catch(() => { state.remove(item.id); });
      }));
    });
  }

  /**
   * Save the restore data for a given widget.
   *
   * @param widget - The widget being saved.
   */
  save(widget: T): void {
    let injected = Private.injectedProperty.get(widget);
    if (!this._restore || !this.has(widget) || injected) {
      return;
    }

    let { state } = this._restore;
    let widgetName = this._restore.name(widget);
    let oldName = Private.nameProperty.get(widget);
    let newName = widgetName ? `${this.namespace}:${widgetName}` : null;

    if (oldName && oldName !== newName) {
      state.remove(oldName);
    }

    // Set the name property irrespective of whether the new name is null.
    Private.nameProperty.set(widget, newName);

    if (newName) {
      let data = this._restore.args(widget);
      state.save(newName, { data });
    }
  }

  /**
   * Handle the current change event.
   *
   * #### Notes
   * The default implementation is a no-op. This may be reimplemented by
   * subclasses to customize the behavior.
   */
  protected onCurrentChanged(): void {
    /* This is a no-op. */
  }

  /**
   * Handle the current change signal from the internal focus tracker.
   */
  private _onCurrentChanged(sender: any, args: FocusTracker.ICurrentChangedArgs<T>): void {
    this.onCurrentChanged();
    this.currentChanged.emit(args.newValue);
  }

  /**
   * Clean up after disposed widgets.
   */
  private _onWidgetDisposed(widget: T): void {
    let injected = Private.injectedProperty.get(widget);
    if (injected || !this._restore) {
      return;
    }
    // If restore data was saved, delete it from the database.
    let { state } = this._restore;
    let name = Private.nameProperty.get(widget);

    if (name) {
      state.remove(name);
    }
  }

  private _isDisposed = false;
  private _restore: InstanceTracker.IRestoreOptions<T> = null;
  private _tracker = new FocusTracker<T>();
}


// Define the signals for the `InstanceTracker` class.
defineSignal(InstanceTracker.prototype, 'currentChanged');


/**
 * A namespace for `InstanceTracker` statics.
 */
export
namespace InstanceTracker {
  /**
   * The instantiation options for an instance tracker.
   */
  export
  interface IOptions {
    /**
     * A namespace for all tracked widgets, (e.g., `notebook`).
     */
    namespace: string;
  }

  /**
   * The state restoration configuration options.
   */
  export
  interface IRestoreOptions<T extends Widget> extends IInstanceRestorer.IRestoreOptions<T> {
    /*
     * The instance restorer to use to recreate restored widgets.
     */
    restorer: IInstanceRestorer;

    /**
     * The command registry which holds the restore command.
     */
    registry: CommandRegistry;

    /**
     * The state database instance.
     */
    state: IStateDB;
  }
}


/*
 * A namespace for private data.
 */
namespace Private {
  /**
   * An attached property to indicate whether a widget has been injected.
   */
  export
  const injectedProperty = new AttachedProperty<Widget, boolean>({
    name: 'injected',
    value: false
  });

  /**
   * An attached property for a widget's ID in the state database.
   */
  export
  const nameProperty = new AttachedProperty<Widget, string>({ name: 'name' });
}
