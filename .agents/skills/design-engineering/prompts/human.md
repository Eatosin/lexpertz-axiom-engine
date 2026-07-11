You are adapting a 21st.dev Magic component into the current project.

**Component reference:** {component_name} by {author} (id: {component_id})

**User's design spec:** {design_spec}

**Project context:**
- Framework: {framework}
- Tailwind config: {tailwind_config_summary}
- Design system: {design_system_name} ({design_tokens_summary})
- Existing dependencies: {installed_deps}

## Workflow

1. **Search first**: If {component_name} is not yet confirmed, call `search_components`:
   ```
   search_components(query: "{design_spec}", limit: 5)
   ```
   Pick the best match by: visual fit to the spec, dependency overlap with {installed_deps},
   responsive breakpoint alignment, and animation style compatibility.

2. **Retrieve source**: Call `get_component` with the selected component ID:
   ```
   get_component(id: {component_id})
   ```
   Review the raw JSX/TSX, imports, and Tailwind class usage.

3. **Resolve dependencies**: Compare the component's imports against {installed_deps}.
   Install any missing packages with:
   ```
   npm install <missing-packages>
   ```
   If the component requires 3+ new packages, prefer `21st add {component_id}` for
   auto-resolution via the shadcn-style registry.

4. **Adapt and write**:
   - Replace hardcoded colors with project theme tokens
   - Map spacing to the project's Tailwind config
   - Add keyboard accessibility (tabIndex, aria-*)
   - Add error boundaries, loading states, empty states
   - Add dark mode support via `dark:` variant
   - Preserve framer-motion animation variants

5. **Attribute**:
   ```tsx
   // Adapted from 21st.dev Magic: {component_name} by {author}
   // Source: https://21st.dev/{source_path}/{component_id}
   ```

## Quality Gates

Before marking the component as complete, verify:
- [ ] All npm dependencies are installed and version-compatible
- [ ] No hardcoded color values remain (all mapped to theme tokens)
- [ ] Interactive elements have hover, focus, active, and disabled states
- [ ] framer-motion animations are present on interactive elements
- [ ] `dark:` variant support is implemented
- [ ] Loading and empty states exist for data-dependent elements
- [ ] Attribution comment is present at the top of the file
- [ ] TypeScript types are exported for all props
- [ ] Component is importable from the project's component index