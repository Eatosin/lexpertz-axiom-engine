import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool"

type ChangeType = "added" | "modified" | "deleted" | "renamed" | "untracked"

interface ChangeEntry {
  path: string
  changeType: ChangeType
}

function parseStatusLine(line: string): ChangeEntry | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  const status = trimmed.slice(0, 2)
  const path = trimmed.slice(3).trim()
  if (!path) return null
  const renameMatch = path.match(/^(.*) -> (.*)$/)
  const finalPath = renameMatch ? renameMatch[2] : path
  let changeType: ChangeType
  if (status.includes("A")) changeType = "added"
  else if (status.includes("D")) changeType = "deleted"
  else if (status.includes("R")) changeType = "renamed"
  else if (status.includes("?") || status === "??") changeType = "untracked"
  else changeType = "modified"
  return { path: finalPath, changeType }
}

type TreeNode = {
  name: string
  path: string
  changeType?: ChangeType
  children: TreeNode[]
}

function addToTree(children: TreeNode[], segs: string[], fullPath: string, changeType: ChangeType): void {
  if (segs.length === 0) return
  const [head, ...rest] = segs
  let child = children.find((c) => c.name === head)

  if (rest.length === 0) {
    if (child) {
      child.changeType = changeType
      child.path = fullPath
    } else {
      children.push({ name: head, path: fullPath, changeType, children: [] })
    }
    return
  }

  if (!child) {
    child = { name: head, path: segs.slice(0, -rest.length).join("/"), children: [] }
    children.push(child)
  }
  addToTree(child.children, rest, fullPath, changeType)
}

function buildTree(entries: ChangeEntry[]): TreeNode[] {
  const root: TreeNode[] = []
  for (const e of entries) {
    const segs = e.path.split("/").filter(Boolean)
    if (segs.length === 0) continue
    addToTree(root, segs, e.path, e.changeType)
  }
  function sortNodes(nodes: TreeNode[]): TreeNode[] {
    return [...nodes]
      .sort((a, b) => {
        const aIsFile = a.changeType !== undefined
        const bIsFile = b.changeType !== undefined
        if (aIsFile !== bIsFile) return aIsFile ? 1 : -1
        return a.name.localeCompare(b.name)
      })
      .map((n) => ({ ...n, children: sortNodes(n.children) }))
  }
  return sortNodes(root)
}

function renderTree(nodes: TreeNode[], indent: string): string {
  const lines: string[] = []
  for (const node of nodes) {
    if (node.changeType) {
      const markers: Record<ChangeType, string> = {
        added: "+",
        modified: "~",
        deleted: "-",
        renamed: ">",
        untracked: "?",
      }
      lines.push(`${indent}${node.name} (${markers[node.changeType]})`)
    } else {
      lines.push(`${indent}${node.name}/`)
    }
    if (node.children.length > 0) {
      lines.push(renderTree(node.children, `${indent}  `))
    }
  }
  return lines.join("\n")
}

const changedFilesTool: ToolDefinition = tool({
  description:
    "List files changed in the working tree as a navigable tree. Shows added (+), modified (~), deleted (-), renamed (>), and untracked (?) indicators. Use filter to show only specific change types.",
  args: {
    filter: tool.schema
      .enum(["all", "added", "modified", "deleted", "renamed", "untracked"])
      .optional()
      .describe("Filter by change type (default: all)"),
    format: tool.schema
      .enum(["tree", "json"])
      .optional()
      .describe("Output format: tree for terminal display, json for structured data (default: tree)"),
  },
  async execute(args, context) {
    const filter = args.filter === "all" || !args.filter ? undefined : (args.filter as ChangeType)
    const format = args.format ?? "tree"

    const proc = await Bun.$`git status --porcelain`.cwd(context.worktree || context.directory).nothrow().quiet()
    const stdout = proc.stdout.toString()

    const entries: ChangeEntry[] = stdout
      .split("\n")
      .map(parseStatusLine)
      .filter((e): e is ChangeEntry => e !== null)
      .filter((e) => (filter ? e.changeType === filter : true))
      .sort((a, b) => a.path.localeCompare(b.path))

    if (entries.length === 0) {
      return JSON.stringify({ changed: false, message: "No changes in working tree" })
    }

    if (format === "json") {
      return JSON.stringify(
        {
          changed: true,
          filter: filter ?? "all",
          files: entries,
          diffCommands: entries
            .filter((e) => e.changeType !== "added" && e.changeType !== "untracked")
            .map((e) => `git diff ${e.path}`),
        },
        null,
        2
      )
    }

    const tree = buildTree(entries)
    const diffHint = entries
      .filter((e) => e.changeType !== "added" && e.changeType !== "untracked")
      .slice(0, 5)
      .map((e) => `  git diff ${e.path}`)
      .join("\n")

    let output = `Changed files (${entries.length}):\n\n${renderTree(tree, "")}`
    if (diffHint) {
      output += `\n\nTo view diff for a file:\n${diffHint}`
    }
    return output
  },
})

export default changedFilesTool
