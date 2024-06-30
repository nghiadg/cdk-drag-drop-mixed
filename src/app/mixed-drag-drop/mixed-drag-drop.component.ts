import {
  CdkDrag,
  CdkDragEnd,
  CdkDragMove,
  CdkDragStart,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';

@Component({
  selector: 'app-mixed-drag-drop',
  standalone: true,
  imports: [CommonModule, CdkDrag],
  templateUrl: './mixed-drag-drop.component.html',
  styleUrls: ['./mixed-drag-drop.component.css'],
})
export class MixedDragDropComponent
  implements AfterViewInit, OnDestroy, AfterViewChecked
{
  @ViewChildren(CdkDrag) cdkDragList!: QueryList<CdkDrag>;
  @ViewChild('container') _container!: ElementRef<HTMLElement>;

  public items: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  public enableTransition = true;

  private _cachedItemRects: CachedItemRect[] = [];
  private _thresholdX = 0;
  private _containerGap = 0;
  private _fromIndex = 0;
  private _toIndex = 0;
  private _transitionPendingCount = 0;
  private _draggingElement: HTMLElement | null = null;
  private _cdkDragCount = 0;

  private _cachedItems: number[] = [];

  private _handleTransitionStart = (event: TransitionEvent) => {
    this.enableTransition = true;
    if (event.target !== this._draggingElement) {
      this._transitionPendingCount += 1;
    }
  };

  private _handleTransitionEnd = (event: TransitionEvent) => {
    if (event.target !== this._draggingElement) {
      this._transitionPendingCount -= 1;
    }

    if (this._transitionPendingCount === 0) {
      this.enableTransition = false;
      this._allTransitionEnded();
    }
  };

  private _allTransitionEnded() {
    //TODO: handle to keep animation for dragging reset
  }

  ngAfterViewChecked(): void {
    if (!this.enableTransition) {
      setTimeout(() => {
        this.enableTransition = true;
      }, 0);
    }
  }

  // start test
  add() {
    const newItems = this.items.slice();
    newItems.push(Math.floor(Math.random() * 100));
    this.items = newItems;
  }

  remove() {
    const newItems = this.items.slice();
    newItems.splice(4, 1);
    this.items = newItems;
  }

  private _init() {
    console.log('_handleCdkDragChange');
    const cachedItemRects: CachedItemRect[] = [];
    this.cdkDragList.forEach((item) => {
      const domRect = item.element.nativeElement.getBoundingClientRect();
      cachedItemRects.push({
        item,
        clientRect: domRect,
        transform3d: {
          x: 0,
          y: 0,
          z: 0,
        },
      });
    });

    const { right } = this._container.nativeElement.getBoundingClientRect();
    const containerStyle = getComputedStyle(this._container.nativeElement);

    this._cachedItemRects = cachedItemRects;
    this._thresholdX = right;
    this._containerGap = +containerStyle.gap.split('px')[0];
    this._cachedItems = this.items.slice();
    this._cdkDragCount = this.cdkDragList.length;
  }
  //end test

  ngAfterViewInit(): void {
    this.cdkDragList.changes.subscribe((cdkDrags) => {
      if (cdkDrags.length !== this._cdkDragCount) {
        this._init();
      }
    });

    this._init();

    // detect animation end
    this._container?.nativeElement?.addEventListener(
      'transitionstart',
      this._handleTransitionStart
    );

    this._container?.nativeElement?.addEventListener(
      'transitionend',
      this._handleTransitionEnd
    );
  }

  ngOnDestroy(): void {
    this._container?.nativeElement?.removeEventListener(
      'transitionstart',
      this._handleTransitionStart
    );

    this._container.nativeElement?.removeEventListener(
      'transitionend',
      this._handleTransitionEnd
    );
  }

  public dragStarted(event: CdkDragStart) {
    this._draggingElement = event.source.element.nativeElement;
  }

  public dragMoved(event: CdkDragMove) {
    const pointerX = event.pointerPosition.x;
    const pointerY = event.pointerPosition.y;

    const toIndex = this._getItemIndexFromPointerPosition(
      event.source,
      pointerX,
      pointerY
    );

    const fromIndex = this._cachedItemRects.findIndex(
      (item) => item.item === event.source
    );
    if (toIndex >= 0) {
      const { x, y } = event.delta;
      let delta = x;

      const toItemRect = this._cachedItemRects[toIndex];
      const fromItemRect = this._cachedItemRects[fromIndex];

      if (fromItemRect.clientRect.y !== toItemRect.clientRect.y) {
        delta = y;
      }

      if (delta === 0) return;
      if (delta === 1 && fromIndex > toIndex) return;
      if (delta === -1 && fromIndex < toIndex) return;

      this.sort(fromIndex, toIndex, delta, event.source);
    }
  }

  public dragEnded(event: CdkDragEnd) {
    this.enableTransition = false;
    const cachedItemRects = this._cachedItemRects.slice();

    this.items = this._cachedItems.slice();

    for (let index = 0; index < cachedItemRects.length; index++) {
      cachedItemRects[index].item._dragRef.reset();
      cachedItemRects[index] = {
        ...cachedItemRects[index],
        transform3d: {
          x: 0,
          y: 0,
          z: 0,
        },
      };
    }

    this._cachedItemRects = cachedItemRects;
  }

  private sort(
    currentIndex: number,
    insertIndex: number,
    delta: 1 | -1 | 0,
    dragItem: CdkDrag
  ) {
    console.warn('sort');
    this._fromIndex = currentIndex;
    this._toIndex = insertIndex;
    let cachedItemRects = this._cachedItemRects.slice();

    const startIndex = Math.min(currentIndex, insertIndex);
    const endIndex = Math.max(currentIndex, insertIndex);

    if (delta === 1) {
      for (let i = startIndex; i < endIndex; i++) {
        cachedItemRects = this._updateCachedItemRects(
          i,
          cachedItemRects,
          delta
        );
      }
    } else {
      for (let i = endIndex; i > startIndex; i--) {
        cachedItemRects = this._updateCachedItemRects(
          i,
          cachedItemRects,
          delta
        );
      }
    }

    let line = cachedItemRects[0].clientRect.y;

    for (let index = 0; index < cachedItemRects.length; index++) {
      if (cachedItemRects[index].clientRect.right > this._thresholdX) {
        const { cachedItemRects: cachedItemRectsChanged, line: lineChanged } =
          this._moveItemToBelowLine(
            cachedItemRects,
            index,
            cachedItemRects[index],
            line
          );
        cachedItemRects = cachedItemRectsChanged;
        line = lineChanged;
      } else if (cachedItemRects[index].clientRect.y !== line) {
        const { cachedItemRects: cachedItemRectsChanged, line: lineChanged } =
          this._moveItemToAboveLine(
            cachedItemRects,
            index,
            cachedItemRects[index],
            line
          );
        cachedItemRects = cachedItemRectsChanged;
        line = lineChanged;
      }
    }

    const resetCachedItemRects: CachedItemRect[] = this._cachedItemRects.map(
      (item) => {
        const cachedItemRect = cachedItemRects.find(
          (c) => c.item === item.item
        );
        return cachedItemRect ?? item;
      }
    );

    moveItemInArray(resetCachedItemRects, this._fromIndex, this._toIndex);
    this._cachedItemRects = resetCachedItemRects;

    const cachedItems = this._cachedItems.slice();
    moveItemInArray(cachedItems, this._fromIndex, this._toIndex);
    this._cachedItems = cachedItems;

    cachedItemRects.forEach((cachedItemRect) => {
      if (cachedItemRect.item !== dragItem) {
        cachedItemRect.item.element.nativeElement.style.transform = `translate3d(${cachedItemRect.transform3d.x}px, ${cachedItemRect.transform3d.y}px, 0)`;
      }
    });
  }

  private _moveItemToAboveLine(
    cachedItemRects: CachedItemRect[],
    currentIndex: number,
    currentItem: CachedItemRect,
    line: number
  ) {
    const previousItem = cachedItemRects[currentIndex - 1];
    const previousStyle = getComputedStyle(
      previousItem.item.element.nativeElement
    );

    const marginRight = +previousStyle.marginRight.split('px')[0];

    const clientRectX =
      previousItem.clientRect.right + marginRight + this._containerGap;
    // Move item into above line
    if (
      clientRectX + currentItem.clientRect.right - currentItem.clientRect.x <=
      this._thresholdX
    ) {
      const clientRect: DOMRect = JSON.parse(
        JSON.stringify(cachedItemRects[currentIndex].clientRect)
      );
      const offsetX = clientRectX - currentItem.clientRect.x;
      const offsetY = previousItem.clientRect.y - currentItem.clientRect.y;

      const nextItem = cachedItemRects[currentIndex + 1];
      if (nextItem) {
        const spaceOffset = currentItem.clientRect.x - nextItem.clientRect.x;

        const cachedItemRectsChanged = this._updateCachedItemRectsOnLine(
          cachedItemRects,
          currentItem.clientRect.y,
          spaceOffset,
          currentItem.item
        );

        cachedItemRects = cachedItemRectsChanged;
      }

      cachedItemRects[currentIndex] = {
        ...currentItem,
        clientRect: {
          ...clientRect,
          x: clientRectX,
          right: clientRectX + clientRect.right - clientRect.x,
          y: previousItem.clientRect.y,
          bottom: previousItem.clientRect.bottom,
        },
        transform3d: {
          ...currentItem.transform3d,
          x: currentItem.transform3d.x + offsetX,
          y: currentItem.transform3d.y + offsetY,
        },
      };
    } else {
      line = currentItem.clientRect.y;
    }

    return { cachedItemRects, line };
  }

  private _moveItemToBelowLine(
    cachedItemRects: CachedItemRect[],
    currentIndex: number,
    currentItem: CachedItemRect,
    line: number
  ) {
    const nextItem = cachedItemRects[currentIndex + 1];
    let offsetX = 0;
    let offsetY = 0;
    let spaceOffset = 0;
    if (nextItem) {
      offsetX = nextItem.clientRect.x - currentItem.clientRect.x;
      offsetY = nextItem.clientRect.y - currentItem.clientRect.y;
    } else {
      const firstItem = cachedItemRects.find(
        (item) => item.clientRect.y === currentItem.clientRect.y
      );
      if (firstItem) {
        offsetX = firstItem?.clientRect.x - currentItem.clientRect.x;
      }
      offsetY =
        currentItem.clientRect.bottom +
        this._containerGap -
        currentItem.clientRect.y;
    }

    const clientRect: DOMRect = JSON.parse(
      JSON.stringify(currentItem.clientRect)
    );

    const itemRect: CachedItemRect = {
      ...currentItem,
      clientRect: {
        ...clientRect,
        x: currentItem.clientRect.x + offsetX,
        right: currentItem.clientRect.right + offsetX,
        y: currentItem.clientRect.y + offsetY,
        bottom: currentItem.clientRect.bottom + offsetY,
      },
      transform3d: {
        ...currentItem.transform3d,
        x: currentItem.transform3d.x + offsetX,
        y: currentItem.transform3d.y + offsetY,
      },
    };

    if (nextItem) {
      spaceOffset =
        itemRect.clientRect.right - nextItem.clientRect.x + this._containerGap;
    }

    const cachedItemRectsChanged = this._updateCachedItemRectsOnLine(
      cachedItemRects,
      nextItem?.clientRect?.y ?? itemRect.clientRect.y,
      spaceOffset
    );
    cachedItemRects = cachedItemRectsChanged;

    cachedItemRects[currentIndex] = itemRect;

    line = nextItem?.clientRect?.y ?? itemRect.clientRect.y;

    return { cachedItemRects, line };
  }

  private _updateCachedItemRects(
    index: number,
    cachedItemRects: CachedItemRect[],
    delta: 1 | -1 | 0
  ) {
    const { offsetX, siblingOffsetX } = this._getOffsetX(
      index,
      cachedItemRects,
      delta
    );
    const { offsetY, siblingOffsetY } = this._getOffsetY(
      index,
      cachedItemRects,
      delta
    );

    // update rect
    const currentItemRect = cachedItemRects[index];
    const siblingItemRect = cachedItemRects[index + delta * 1];

    const nextClientRect = JSON.parse(
      JSON.stringify(currentItemRect.clientRect)
    );
    const nextRect: CachedItemRect = {
      item: currentItemRect.item,
      clientRect: {
        ...nextClientRect,
        x: currentItemRect.clientRect.x + offsetX,
        right: currentItemRect.clientRect.right + offsetX,
        y: currentItemRect.clientRect.y + offsetY,
        bottom: currentItemRect.clientRect.bottom + offsetY,
      },
      transform3d: {
        ...currentItemRect.transform3d,
        x: currentItemRect.transform3d.x + offsetX,
        y: currentItemRect.transform3d.y + offsetY,
      },
    };

    const siblingClientRect = JSON.parse(
      JSON.stringify(siblingItemRect.clientRect)
    );
    const siblingNextRect: CachedItemRect = {
      item: siblingItemRect.item,
      clientRect: {
        ...siblingClientRect,
        x: siblingItemRect.clientRect.x + siblingOffsetX,
        right: siblingItemRect.clientRect.right + siblingOffsetX,
        y: siblingItemRect.clientRect.y + siblingOffsetY,
        bottom: siblingItemRect.clientRect.bottom + siblingOffsetY,
      },
      transform3d: {
        ...siblingItemRect.transform3d,
        x: siblingItemRect.transform3d.x + siblingOffsetX,
        y: siblingItemRect.transform3d.y + siblingOffsetY,
      },
    };

    if (offsetY !== siblingOffsetY) {
      const spaceOffset =
        (nextRect.clientRect.right - siblingItemRect.clientRect.right) * delta;
      siblingClientRect;

      const clientRectY =
        delta === 1
          ? siblingItemRect.clientRect.y
          : currentItemRect.clientRect.y;

      const ignoreItem =
        delta === 1 ? siblingItemRect.item : currentItemRect.item;

      const cachedItemRectsChanged = this._updateCachedItemRectsOnLine(
        cachedItemRects,
        clientRectY,
        spaceOffset,
        ignoreItem
      );

      cachedItemRects = cachedItemRectsChanged;
    }

    cachedItemRects[index] = siblingNextRect;
    cachedItemRects[index + delta * 1] = nextRect;

    return cachedItemRects;
  }

  private _updateCachedItemRectsOnLine(
    siblings: CachedItemRect[],
    clientRectY: number,
    spaceOffset: number,
    ignoreItem?: CdkDrag
  ) {
    siblings
      .filter(
        (item) =>
          (!ignoreItem || item.item !== ignoreItem) &&
          item.clientRect.y === clientRectY
      )
      .forEach((item) => {
        const index = siblings.findIndex(
          (sibling) => sibling.item == item.item
        );
        const clientRect = JSON.parse(JSON.stringify(item.clientRect));

        siblings[index] = {
          ...siblings[index],
          clientRect: {
            ...clientRect,
            x: siblings[index].clientRect.x + spaceOffset,
            right: siblings[index].clientRect.right + spaceOffset,
          },
          transform3d: {
            ...siblings[index].transform3d,
            x: siblings[index].transform3d.x + spaceOffset,
          },
        };
      });

    return siblings;
  }

  private _getItemIndexFromPointerPosition(
    item: CdkDrag,
    pointerX: number,
    pointerY: number
  ) {
    const elementsAtPoint = document.elementsFromPoint(pointerX, pointerY);
    if (!elementsAtPoint.length) return -1;
    const elementAtPoint = elementsAtPoint.find(
      (el) =>
        el !== item.element.nativeElement &&
        el.parentElement === this._container.nativeElement
    );
    if (!elementAtPoint) return -1;

    const index = this._cachedItemRects.findIndex(
      (item) => item.item.element.nativeElement === elementAtPoint
    );

    return index;
  }

  private _getOffsetX(
    currentIndex: number,
    siblings: CachedItemRect[],
    delta: 1 | -1 | 0
  ) {
    const currentPosition = siblings[currentIndex].clientRect;
    const immediateSibling = siblings[currentIndex + delta].clientRect;

    let offsetX = currentPosition.x * delta;
    let siblingOffsetX = currentPosition.x * delta;

    if (immediateSibling) {
      if (delta === 1) {
        offsetX = immediateSibling.right - currentPosition.right;
        siblingOffsetX = currentPosition.x - immediateSibling.x;
      } else {
        offsetX = immediateSibling.x - currentPosition.x;
        siblingOffsetX = currentPosition.right - immediateSibling.right;
      }

      if (delta === 1 && immediateSibling.x < currentPosition.x) {
        offsetX = immediateSibling.x - currentPosition.x;
      }

      if (delta === -1 && immediateSibling.right > currentPosition.right) {
        siblingOffsetX = currentPosition.x - immediateSibling.x;
      }
    }

    return {
      offsetX,
      siblingOffsetX,
    };
  }

  private _getOffsetY(
    currentIndex: number,
    siblings: CachedItemRect[],
    delta: 1 | -1 | 0
  ) {
    const currentPosition = siblings[currentIndex].clientRect;
    const immediateSibling = siblings[currentIndex + delta].clientRect;

    let offsetY = currentPosition.y * delta;
    let siblingOffsetY = -offsetY;

    if (immediateSibling) {
      if (delta === 1) {
        offsetY = immediateSibling.y - currentPosition.y;
        siblingOffsetY = -offsetY;
      } else {
        offsetY = immediateSibling.y - currentPosition.y;
        siblingOffsetY = -offsetY;
      }
    }

    return {
      offsetY,
      siblingOffsetY,
    };
  }
}

interface CachedItemRect {
  item: CdkDrag;
  clientRect: DOMRect;
  transform3d: {
    x: number;
    y: number;
    z: number;
  };
}
