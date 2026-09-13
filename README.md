# Updex

Updex is a TypeScript toolkit for applications organized around models, updates,
execs, views, and adapters.
Its model/update style is influenced by The Elm Architecture, with environmental
work flowing through commands and execs.

### Running example: **Harbor**

To make those pieces easier to picture, this guide follows **Harbor**, a small
fictional app that tracks vessels and their depth readings. Its screen owns the
meaning of those readings, the surrounding app coordinates work, and composition
connects the runtime to concrete implementations. **Harbor** illustrates the
architecture; it is not an included application.

## Architecture

[AGENTS.md](AGENTS.md) defines the binding architecture rules. This guide uses a
fictional harbor simulation to show how those rules fit together. The examples
are illustrative; AGENTS.md remains the source of the requirements.

### Ownership and dependencies

The harbor **screen** owns vessel semantics, transitions, commands and execs,
domain APIs, and declarative presentation. The **app** owns application policy,
environmental coordination, app commands and execs, and aggregate application
contracts. **Composition** selects implementations, wires capabilities,
assembles runtime registries, initializes dependencies, connects callbacks, and
starts runtime.

```text
composition ──► app ──► screen
     │                   ▲
     ├───────────────────┘
     └──► adapters ──► app/screen contracts and permitted domain functions
```

Screens do not import app modules or concrete adapters; app modules do not import
adapters. Composition connects adapters, including through responsibility-specific
`src/main/**` composition aggregate modules. Handlers and API maps stay with their
owners; implementation placement does not transfer domain ownership. See
[dependency boundaries](AGENTS.md#dependency-boundaries).

### Commands, execs, and completions

Updates apply one message to the model and may return commands. Environmental
computation, including synchronous computation, flows through commands and
execs. A completion update applies the result, validating it when domain rules
require. The runtime invokes the view callback before commands, in array order,
without awaiting earlier commands:

```text
update → synchronous view callback → commands in array order
```

For example, a depth request can carry an identity so its completion update
ignores obsolete results:

```ts
export const screenHarborDepthMeasuredUpdate: UpdexUpdate<
  ScreenHarborModel,
  ScreenHarborDepthMeasuredMsg
> = ({ model, msg }) => {
  if (msg.data.screenHarborRequest !== model.screenHarborPendingRequest) return
  model.screenHarborDepth = msg.data.screenHarborDepth
}

export const screenHarborMeasureRequestedUpdate: UpdexUpdate<
  ScreenHarborModel,
  ScreenHarborMeasureRequestedMsg,
  ScreenHarborMeasureDepthCmd
> = ({ model, msg }) => {
  model.screenHarborPendingRequest = msg.data.screenHarborRequest
  return {
    data: { screenHarborRequest: msg.data.screenHarborRequest },
    name: 'ScreenHarborMeasureDepthCmd',
  }
}
```

See [handler and runtime rules](AGENTS.md#updates-execs-and-runtime) for result
contracts, command order, and completion dispatch.

### Domain, implementations, and presentation

The domain owns operation meaning, valid results, invariants, and permitted
variation. Consumer-owned capabilities keep dependencies narrow, while
composition checks and combines implementations. See
[contracts and composition](AGENTS.md#contracts-and-composition).

Views derive presentation from their owning model, dispatch messages, and handle
local events. The runtime invokes the view callback with post-update state before
commands; each project defines presentation ordering, redraw policy, and renderer
state. Completion-dependent work needs an explicit guarantee. See
[persistence](AGENTS.md#persistence) and
[presentation and lifecycle](AGENTS.md#presentation-and-lifecycle) for the
details.

### Rule index

[Module placement](AGENTS.md#module-ownership-and-placement), [handler contracts](AGENTS.md#handler-contracts),
[API wrappers](AGENTS.md#api-exec-wrappers-and-transport), [naming](AGENTS.md#contract-member-naming),
[ordering](AGENTS.md#name-ordering), and [review evidence](AGENTS.md#review-evidence)
define implementation and review requirements. Every repository change must pass
`pnpm fmt && pnpm check` from the repository root.
