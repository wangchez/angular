import {Injectable, Inject} from "angular2/di";
import {RenderViewRef, RenderFragmentRef, RenderViewWithFragments} from "angular2/src/render/api";
import {ON_WEBWORKER} from "angular2/src/web-workers/shared/api";
import {List, ListWrapper} from "angular2/src/facade/collection";

@Injectable()
export class RenderViewWithFragmentsStore {
  private _nextIndex: number = 0;
  private _onWebWorker: boolean;
  private _lookupByIndex: Map<number, RenderViewRef | RenderFragmentRef>;
  private _lookupByView: Map<RenderViewRef | RenderFragmentRef, number>;

  constructor(@Inject(ON_WEBWORKER) onWebWorker) {
    this._onWebWorker = onWebWorker;
    if (!onWebWorker) {
      this._lookupByIndex = new Map<number, RenderViewRef | RenderFragmentRef>();
      this._lookupByView = new Map<RenderViewRef | RenderFragmentRef, number>();
    }
  }

  allocate(fragmentCount: number): RenderViewWithFragments {
    var viewRef = new WorkerRenderViewRef(this._nextIndex++);
    var fragmentRefs = ListWrapper.createGrowableSize(fragmentCount);

    for (var i = 0; i < fragmentCount; i++) {
      fragmentRefs[i] = new WorkerRenderFragmentRef(this._nextIndex++);
    }
    return new RenderViewWithFragments(viewRef, fragmentRefs);
  }

  store(view: RenderViewWithFragments, startIndex: number) {
    this._lookupByIndex.set(startIndex, view.viewRef);
    this._lookupByView.set(view.viewRef, startIndex);
    startIndex++;

    ListWrapper.forEach(view.fragmentRefs, (ref) => {
      this._lookupByIndex.set(startIndex, ref);
      this._lookupByView.set(ref, startIndex);
      startIndex++;
    });
  }

  retreive(ref: number): RenderViewRef | RenderFragmentRef {
    if (ref == null) {
      return null;
    }
    return this._lookupByIndex.get(ref);
  }

  serializeRenderViewRef(viewRef: RenderViewRef): number {
    return this._serializeRenderFragmentOrViewRef(viewRef);
  }

  serializeRenderFragmentRef(fragmentRef: RenderFragmentRef): number {
    return this._serializeRenderFragmentOrViewRef(fragmentRef);
  }

  deserializeRenderViewRef(ref: number): RenderViewRef {
    if (ref == null) {
      return null;
    }

    if (this._onWebWorker) {
      return WorkerRenderViewRef.deserialize(ref);
    } else {
      return this.retreive(ref);
    }
  }

  deserializeRenderFragmentRef(ref: number): RenderFragmentRef {
    if (ref == null) {
      return null;
    }

    if (this._onWebWorker) {
      return WorkerRenderFragmentRef.deserialize(ref);
    } else {
      return this.retreive(ref);
    }
  }

  private _serializeRenderFragmentOrViewRef(ref: RenderViewRef | RenderFragmentRef): number {
    if (ref == null) {
      return null;
    }

    if (this._onWebWorker) {
      return (<WorkerRenderFragmentRef | WorkerRenderViewRef>ref).serialize();
    } else {
      return this._lookupByView.get(ref);
    }
  }

  serializeViewWithFragments(view: RenderViewWithFragments): StringMap<string, any> {
    if (view == null) {
      return null;
    }

    if (this._onWebWorker) {
      return {
        'viewRef': (<WorkerRenderViewRef>view.viewRef).serialize(),
        'fragmentRefs': ListWrapper.map(view.fragmentRefs, (val) => val.serialize())
      };
    } else {
      return {
        'viewRef': this._lookupByView.get(view.viewRef),
        'fragmentRefs': ListWrapper.map(view.fragmentRefs, (val) => this._lookupByView.get(val))
      };
    }
  }

  deserializeViewWithFragments(obj: StringMap<string, any>): RenderViewWithFragments {
    if (obj == null) {
      return null;
    }

    var viewRef: RenderViewRef | RenderFragmentRef;
    var fragments: List<RenderViewRef | RenderFragmentRef>;
    if (this._onWebWorker) {
      viewRef = WorkerRenderViewRef.deserialize(obj['viewRef']);
      fragments =
          ListWrapper.map(obj['fragmentRefs'], (val) => WorkerRenderFragmentRef.deserialize(val));

      return new RenderViewWithFragments(viewRef, fragments);
    } else {
      viewRef = this.retreive(obj['viewRef']);
      fragments = ListWrapper.map(obj['fragmentRefs'], (val) => this.retreive(val));

      return new RenderViewWithFragments(viewRef, fragments);
    }
  }
}

export class WorkerRenderViewRef extends RenderViewRef {
  constructor(public refNumber: number) { super(); }
  serialize(): number { return this.refNumber; }

  static deserialize(ref: number): WorkerRenderViewRef { return new WorkerRenderViewRef(ref); }
}

export class WorkerRenderFragmentRef extends RenderFragmentRef {
  constructor(public refNumber: number) { super(); }

  serialize(): number { return this.refNumber; }

  static deserialize(ref: number): WorkerRenderFragmentRef {
    return new WorkerRenderFragmentRef(ref);
  }
}
