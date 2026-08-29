/**
 * Whether the section rail is collapsed, remembered between visits.
 *
 * The width is driven by an attribute on `<html>` rather than by React state,
 * for the same reason the theme is: it has to be right before the first paint.
 * A rail that rendered at 236px and snapped to 60px after hydration would flash
 * on every navigation, and the flash would be worst for the person who
 * deliberately collapsed it.
 *
 * So the attribute is the single source of truth. `NAV_INIT_SCRIPT` stamps it
 * before React runs, the stylesheet reads it, and the toggle writes it — no
 * React state decides the layout, and there is nothing for the server and the
 * client to disagree about.
 */
export const NAV_STORAGE_KEY = "foodishi.operator.nav.collapsed";

export const NAV_ATTRIBUTE = "data-nav-collapsed";

/**
 * Runs before first paint, in the document head. Deliberately tiny and
 * defensive: storage can throw in a private window, and a console that failed
 * to boot over a sidebar preference would be an absurd way to lose a shift.
 */
export const NAV_INIT_SCRIPT = `(function(){try{if(localStorage.getItem("${NAV_STORAGE_KEY}")==="1"){document.documentElement.setAttribute("${NAV_ATTRIBUTE}","true")}}catch(e){}})();`;

export function isNavCollapsed(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute(NAV_ATTRIBUTE) === "true";
}

/** Writes the attribute first, so the layout moves in the same frame as the tap. */
export function setNavCollapsed(collapsed: boolean): void {
  if (typeof document === "undefined") return;

  if (collapsed) document.documentElement.setAttribute(NAV_ATTRIBUTE, "true");
  else document.documentElement.removeAttribute(NAV_ATTRIBUTE);

  try {
    localStorage.setItem(NAV_STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // The choice then lasts as long as the tab, which is good enough.
  }
}
