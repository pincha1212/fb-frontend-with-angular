import { ScrollAnimationDirective } from './scroll-animation.directive';

describe('ScrollAnimationDirective', () => {
  it('should create an instance', () => {
    const elementRef = { nativeElement: document.createElement('div') };
    const renderer = jasmine.createSpyObj('Renderer2', ['setStyle']);
    const directive = new ScrollAnimationDirective(elementRef, renderer);
    expect(directive).toBeTruthy();
  });
});
