# Style Consolidation Audit & Migration Plan

**Status:** In Progress  
**Target:** Remove ALL inline styles and consolidate into `src/styles/global.css`

---

## Inline Style Patterns Found

### 1. ✅ Sparkle Buttons (COMPLETED)
**Locations:**
- `src/pages/wishlists.astro` - ✅ Converted to `.btn-sparkle`
- `src/pages/wishlist/[id].astro` - ✅ Converted to `.btn-sparkle` (2 instances)

**Pattern:**
```html
<!-- OLD -->
class="relative overflow-hidden group ... bg-gradient-to-r from-gray-700 to-gray-900 hover:from-purple-600 hover:to-violet-500"

<!-- NEW -->
class="btn-sparkle"
```

---

### 2. 🔄 Primary Action Buttons (NEEDS MIGRATION)
**Locations:**
- `src/pages/index.astro` - Lines 45, 57, 69 (bg-gray-700/hover:bg-gray-800)
- `src/pages/index.astro` - Line 57 (anomaly: bg-slate-700 - **BREAKING GRAYSCALE**)

**Pattern:**
```html
class="bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 transition-colors"
```

**Solution:** Use `.btn-primary` class

---

### 3. 🔴 Blue/Color Violations (NEEDS FIXING)
**Locations:**
- `src/pages/index.astro` - Line 81 (bg-blue-50/border-blue-200 - **BREAKING GRAYSCALE**)

**Pattern:**
```html
class="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2.5 rounded-lg hover:bg-blue-100 hover:border-blue-300"
```

**Issue:** Uses blue instead of grayscale. This is the "dependency action" link.

**Solution:** Create `.link-secondary` utility class or change to grayscale

---

### 4. 📋 Form Field Styles (NEEDS AUDIT)
**Locations:**
- `src/pages/fulfill.astro` - Lines 289, 313, 324, 352

**Patterns:**
```html
class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-500"
class="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs border border-gray-200"
class="bg-blue-50 border border-blue-200 p-4 rounded-md" style="display: none;"
```

**Issues:** 
- Inconsistent padding/sizing
- Blue color violation in fulfill.astro
- Inline style for display

---

## Classes to Add/Standardize

### ✅ Already Defined
- `.btn-primary` - Gray button with hover
- `.btn-secondary` - Border button
- `.btn-sparkle` - Gradient with particles
- `.form-input` - Input fields
- `.form-textarea` - Textareas
- `.form-label` - Labels

### 🔴 Missing/Needed
- `.link-secondary` - Secondary link styling (currently using blue)
- `.badge-default` - Small inline badges
- `.alert-info` - Info alert boxes (currently using blue)
- `.status-badge` - Status indicators
- `.field-disabled` - Disabled field styling

---

## Migration Priority

### 🔴 High Priority (Breaking Grayscale)
1. Replace blue colors in `index.astro` line 81
2. Fix anomaly: bg-slate-700 in `index.astro` line 57
3. Fix blue in `fulfill.astro` form sections

### 🟡 Medium Priority (Consistency)
4. Standardize form field styling in `fulfill.astro`
5. Replace all inline `.space-y-3`, `.space-x-4` with consistent spacing classes
6. Consolidate button styling variations

### 🟢 Low Priority (Nice to Have)
7. Create component-specific utility classes
8. Document all color tokens
9. Create Figma tokens sync

---

## Files Requiring Changes

| File | Issue | Priority | Status |
|------|-------|----------|--------|
| `src/pages/index.astro` | Blue colors, inconsistent buttons | 🔴 High | Pending |
| `src/pages/fulfill.astro` | Blue in form sections | 🔴 High | Pending |
| `src/pages/wishlist/[id].astro` | Sparkle buttons | ✅ Done | Complete |
| `src/pages/wishlists.astro` | Sparkle buttons | ✅ Done | Complete |
| `src/pages/catalog.astro` | TBD | 🟡 Med | Pending |
| `src/pages/maintainers.astro` | TBD | 🟡 Med | Pending |
| `src/pages/apply-practitioner.astro` | TBD | 🟡 Med | Pending |
| `src/styles/global.css` | Add missing classes | 🟡 Med | In Progress |

---

## Code Examples

### Example 1: Button Standardization

**Before:**
```html
<a href="/foo" class="bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 transition-colors">
  Click Me
</a>
```

**After:**
```html
<a href="/foo" class="btn-primary">
  Click Me
</a>
```

---

### Example 2: Link Styling

**Before:**
```html
<a href="/foo" class="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2.5 rounded-lg hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-colors font-medium text-sm">
  Learn More
  <svg>...</svg>
</a>
```

**After:**
```html
<a href="/foo" class="link-secondary">
  Learn More
  <svg>...</svg>
</a>
```

**New `.link-secondary` in global.css:**
```css
.link-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: 1px solid rgb(209, 213, 219);
  color: rgb(55, 65, 81);
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 200ms ease-in-out;
  background: white;
}

.link-secondary:hover {
  background-color: rgb(249, 250, 251);
  border-color: rgb(191, 199, 212);
}

.link-secondary:focus-visible {
  outline: 2px solid rgb(75, 85, 99);
  outline-offset: 2px;
}
```

---

## Grayscale Color Palette (Final)

All colors must use this palette ONLY:

| Use Case | Color | RGB | Hex |
|----------|-------|-----|-----|
| Background | Gray-50 | rgb(249, 250, 251) | #F9FAFB |
| Section | Gray-100 | rgb(243, 244, 246) | #F3F4F6 |
| Border | Gray-200 | rgb(229, 231, 235) | #E5E7EB |
| Disabled | Gray-300 | rgb(209, 213, 219) | #D1D5DB |
| Muted Text | Gray-600 | rgb(75, 85, 99) | #4B5563 |
| Button | Gray-700 | rgb(55, 65, 81) | #374151 |
| Button Dark | Gray-800 | rgb(31, 41, 55) | #1F2937 |
| Text | Gray-900 | rgb(17, 24, 39) | #111827 |
| Accent (Hover) | Purple-600 | rgb(147, 51, 234) | #9333EA |
| Accent Dark | Violet-500 | rgb(109, 40, 217) | #6D28D9 |

**NO OTHER COLORS ALLOWED** in component classes.

---

## Next Steps

1. ✅ Complete sparkle button migration
2. 🔄 Fix blue color violations in index.astro
3. 🔄 Fix blue violations in fulfill.astro
4. 🔄 Add `.link-secondary` class to global.css
5. 🔄 Add `.alert-*` utility classes
6. 🔄 Audit and consolidate form styling
7. ✅ Document final design tokens
8. 🔄 Final audit of all pages

---

**Last Updated:** November 7, 2025  
**Completion Target:** November 8, 2025  
**Lead:** GitHub Copilot
