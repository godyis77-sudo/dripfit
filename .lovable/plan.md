
The user clarified the routing: "COP or DROP" card actually navigates to `/closet` which is the **product discovery swipe** (not community posts). So the labels should be:

- `WeeklyOutfitsSection` (top hero) = curated weekly editorial outfits
- `SwipeFeedSection` ("THE DROP · THIS WEEK") = community posts (user-submitted fits)
- `COP or DROP` card → `/closet` = product discovery swipe (Tinder-style for shopping new pieces)

Three distinct surfaces, currently confusingly labeled. Here's the copy fix:

## Proposed Copy

| Section | Current Label | New Label | Subtitle | Source |
|---|---|---|---|---|
| Curated weekly outfits (top hero) | "THIS WEEK'S DRIP" | **THIS WEEK'S DRIP** | Curated fits. Dropped weekly. | Editorial AI |
| Community feed (`SwipeFeedSection`) | "THE DROP · THIS WEEK" | **COMMUNITY DROPS** | Real fits. Real bodies. | Users |
| Product swipe card → /closet | "COP or DROP" / "Swipe new drops." | **COP or DROP** | Swipe fresh pieces. | Catalog |

The key fixes:
1. **Remove "THIS WEEK"** from the community feed header — it collides with "THIS WEEK'S DRIP"
2. **Rename community feed to "COMMUNITY DROPS"** — instantly signals user-generated
3. **Keep "COP or DROP" exclusively for the product/closet swipe** — it's the shopping action
4. Subtitles clarify source: *Curated* = editorial, *Real fits. Real bodies.* = community, *Swipe fresh pieces.* = catalog

## Files to Edit

1. **`src/components/home/SwipeFeedSection.tsx`** (~line 145)
   - Header: `"The Drop · This Week"` → `"Community Drops"`
   - Optional: add subtitle row "Real fits. Real bodies."

2. **`src/components/home/GalleryPlayground.tsx`** (~line 175, COP or DROP card)
   - Subtitle: `"Swipe new drops."` → `"Swipe fresh pieces."`
   - Micro: keep `"New drops daily"` (still accurate for catalog)

3. **`src/components/home/AuthenticatedHome.tsx`** (~line 78, COP or DROP card)
   - Subtitle: `"Swipe new drops."` → `"Swipe fresh pieces."`

4. **`src/components/home/WeeklyOutfitsSection.tsx`** — verify header reads "THIS WEEK'S DRIP" with subtitle "Curated fits. Dropped weekly." (update if needed)

No routing, data, or component internals change — copy only.
