# Updex Architecture Rules

This file defines mandatory reusable rules. [README.md](README.md#architecture)
illustrates them with fictional examples; this file governs conflicts. User
instructions take precedence. Use fictional domain names, not identifiers copied
from applications, in architecture examples.

## Ownership and dependencies

### Authority and terminology

| Responsibility      | Ownership                                                                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screen domain       | Models and type-level contracts, operations, messages and completions, commands, input/results, execs, domain-specific APIs, deterministic domain functions, behavioral requirements, invariants, and transitions |
| Screen presentation | Declarative presentation derived from supplied models, message selection/dispatch, and local UI events                                                                                                            |
| App coordination    | Application policy, coordination transitions, environmental coordination, app commands/execs, and aggregate application model/message/command contracts                                                           |
| Adapters            | Concrete platform, storage, renderer, timer, or swappable computation implementations under the relevant responsibility; computation need not perform I/O                                                         |
| Composition roots   | Implementation selection, capability construction/wiring, concrete runtime registries, initialization, callbacks, and startup                                                                                     |

A **capability** is a consumer-owned contract for one responsibility; a **factory
input** describes its required configuration and capabilities. App need not mediate
every screen-owned synchronous capability call. Implementation placement never
transfers domain ownership or renames contracts.

### Guiding principles

Use KISS to choose the straightforward design meeting current requirements,
contracts, and rules; use YAGNI to defer speculative capabilities and generality.
These principles guide open choices but neither override specific rules nor
independently justify rejecting a design.

### Applying these rules

Before review or changes:

1. Identify the target file/package; collect applicable `AGENTS.md` files from its
   directory to the repository root, apply broadest to narrowest, report conflicts,
   and read the relevant README architecture section.
2. Classify screen domain/presentation, app coordination, execs, adapters, models,
   updates, views, and composition. Trace imports, contracts, and factory wiring
   before making claims.
3. Before proposing a production file or ownership directory, check existing
   allowed owners. Identify its owner, independent reason to change, allowed form,
   applicable separation condition, and why plausible existing owners are unsuitable.
4. Run relevant validation after implementation or review.

### Dependency boundaries

Screens must not import app modules or concrete adapters; they may import
screen-owned contracts and deterministic functions. App modules may import
screen-owned types, capability contracts, and deterministic functions, but not
adapters. Adapters may import app/screen type contracts and reuse screen-owned
deterministic functions; this domain reuse is not adapter coupling. Composition
wires concrete adapters. The restrictions below also apply.

#### Type-only imports

`model.ts`, `update.ts`, and `exec.ts` under `apps/*/src/app/**` or
`apps/*/src/screens/**`, including those roots, permit only type-only imports,
local or external: `import type` or explicitly type-only named imports. Runtime
value/side-effect imports, dynamic runtime imports, and `require` are forbidden;
runtime re-exports must not bypass this restriction.

This overrides general function-reuse and factory-delegation permissions. Updates
may call same-module deterministic functions without injected capabilities; execs
receive runtime capabilities through consumer-owned inputs. `src/main/**` is
excluded, even for these filenames.

#### Import paths

The only package-local source alias is `#/screens/...`, which resolves to screen
modules. Its use is not restricted by module location; imports must resolve and
obey ownership and dependency boundaries. Screens must not import app modules.
Within `src/app/**` and `src/screens/**`, relative imports must stay in the
current directory or descend into its subdirectories; module specifiers may not
traverse to parent directories (`..`). Adapters may use parent-relative paths
only for type-only imports of their consumer-owned contracts. These restrictions
apply to static, type-only, re-export, and dynamic imports; external imports such
as `updex/model` are unchanged.

#### Adapter independence and placement

Adapters must not import or re-export other adapters, including through type-only,
dynamic, or barrel edges. The sole exception is family-local `types.ts`, shared
by a selector and its implementations. It may contain only local type declarations
and type-only imports: no factories, functions, constants, classes, schemas,
runtime exports, behavior, or cross-family connections.

A family is a selector and its implementation directory under the responsibility
owning its consumer contract. Place composition-selected platform, renderer,
storage, timer, and swappable computation families together beneath the relevant
`src/app/**/adapters` or `src/screens/**/adapters`. Storage filenames end in
`-store.ts`.
Apply resulting production migrations only as separately scoped alignment work.
A screen-owned capability implemented by an app-placed adapter keeps screen ownership.
Screens may declare synchronous capability contracts for their execs; composition
supplies implementations, and updates do not invoke them.

Screens own operation meaning, valid results, invariants, behavioral requirements,
and permitted variation, even when reused. Keep implementation-independent
computation with the domain. Implementations may differ internally while meeting
the capability's substitution contract. Contracts describe input
ownership, completion, expected failures, and numerical variation without requiring
universal tolerances or fallback policies.

## Modules, contracts, and composition

### Module ownership and placement

Production TypeScript under `apps/**` uses this closed set of forms:

| Location/form                                                                                              | Responsibility                                                                          |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `apps/*/src/main.tsx`, `apps/*/src/worker.ts`                                                              | Composition/platform entry points                                                       |
| Responsibility-named TypeScript beneath `apps/*/src/main/**`                                               | Composition aggregate modules                                                           |
| Tool-required `apps/*/*.config.ts`                                                                         | Application configuration                                                               |
| `model.ts`, `update.ts`, `exec.ts`, `View.tsx` at any level of `src/app` or `src/screens`, including roots | Cohesive owner modules                                                                  |
| Owner-specific `api.ts` beneath `src/app/**` or `src/screens/**`                                           | API boundaries                                                                          |
| Responsibility-named files beneath applicable `adapters/` directories                                      | Selectors, implementations, storage `*-store.ts`, and permitted family-local `types.ts` |

Tests, generated artifacts, stylesheets, and `pkg/**` are outside this allowlist.
Forms do not assign exclusive declaration categories or override ownership,
cohesion, or entry-point, model, view, exec, adapter, and configuration restrictions.

In `src/app/**` and `src/screens/**`, `model.ts` contains only type aliases for
data shapes and domain contracts: no interfaces or runtime values. Aliases must
not contain methods, call signatures, or function-valued members, be named
`*Props`, or represent factory inputs, dependency bundles, adapter interfaces, or
aggregate capabilities. Put pure model constructors in an allowed non-model owner.

Preserve existing allowed modules by default. Cohesive screen model constructors
and inputs may remain with exec factories in `exec.ts`, without renaming or
replacement. Deterministic computation and existing renderer-facing contracts may
remain in `update.ts` unless ownership, dependency, or responsibility conflicts
require movement. Views own DOM presentation; renderer adapters own backend
presentation. Preservation does not permit unrelated responsibilities to accumulate.

A new production file must use an allowed form and be justified because **either**
an explicit rule requires the boundary, it represents an independently changing
responsibility, or every existing owner would cause a concrete ownership,
dependency, or responsibility violation. New ownership directories meet the same
test and contain allowed forms. Amend these guidelines to add forms. Required
boundary moves/renames are not prohibited proliferation.

### Contracts and composition

Declare capability contracts and factory input types beside their consumers,
including execs and adapter consumers. Props are consumer-owned ports implemented
by composition. Inputs may group configuration and capabilities for one
responsibility; props need not have one method each. Do not impose unrelated
dependencies through broad bundles or abstract services.

Declare inline object-shaped `*Props` types containing method or function-valued
members as interfaces, including shapes with data fields. Keep data-only `*Props`
shapes and union, intersection, composed, or transformed expressions as type aliases.

Factories implementing non-adapter consumer contracts check compatibility with a
consumer-based return annotation or delegate to a factory carrying that annotation.
For adapter-owned contracts, composition checks implementations through a typed
consumer parameter. Adapters may implement complete props, selected requirements
with `Pick`, or intersections of consumer contracts. `Partial<Props>` only makes
requirements optional; it does not select a portion. Preserve implementation-boundary
annotations and composition checks. Use `satisfies` only as `satisfies never` for
exhaustiveness.

A consumer's declared parameter defines its dependencies; extra members on a wider
forwarded object do not. Aggregate exec registry factories may intersect
capabilities for construction/forwarding. Do not create one-field aliases for a
single update or convenience aggregate renderer, physics, or adapter interfaces.

Composition roots may asynchronously initialize capabilities before runtime
startup, wire callbacks, and issue startup commands. Reusable policy, domain computation,
and platform implementation stay outside them. `main.tsx` contains only imports,
reference directives, entry-point configuration type/value, `main`, and its
invocation. Responsibility-named modules under `src/main/**` are composition
aggregates. They may import owner contracts and adapters, select implementations,
and assemble families. App, screens, and adapters must not import `src/main/**`.
Only composition connects multiple adapters; these modules contain
responsibility-specific wiring, not unrelated utilities.

Put runtime type dependencies in `tsconfig.json` by default. If a package has
multiple runtimes with distinct type dependencies, put `/// <reference
types="…" />` directives for each runtime's types on its composition root. This
placement does not guarantee ambient-type isolation: roots compiled in the same
TypeScript project may still see declarations loaded by another root.

Composition owns concrete runtime update/exec registry builders. It registers
direct update handlers without update props and may construct, select, combine,
and register exec factories and implementations. Factory-level delegation solely
for contract compatibility/type checking is permitted subject to import
restrictions; it is not runtime handler delegation. Conceptual app/screen owners
keep individual commands, handlers, schemas, and API validation. Owners may retain
API maps and responsibility aggregates; composition and aggregate registries may
combine, forward, and register owners without transferring ownership. Generic
transport remains app-owned.

In `main`, construct stateless dependencies at use sites, recreate stateless
stores where loaded/supplied, and construct stateless API clients per request.
Share locals only for stateful/lifecycle-bound objects or the application instance.
Forward compatible `cfg`/`props` directly; otherwise spread them and apply
deliberate overrides afterward, preserving the [ordering rules](#name-ordering).
Rename originating properties with renamed concepts. Add no `readonly` or
`Readonly` unless an external API requires it.

Adapters have no module-level `const` declarations or private module-level
implementation functions. Keep constants and focused adapter helpers inside
their consuming factory; put focused deterministic domain functions in allowed
owner modules. Catch-all utility modules and generic helpers are forbidden.

## Updates, execs, and runtime

### Handler contracts

Each update is a directly annotated `const` `UpdexUpdate<Model, MessageEvent,
Result>` handler for exactly one message event, named without `create` and
registered directly. No update factories, props, injected capabilities, separate
configuration inputs, or shared/generic update aliases. Updates receive only the
supplied model and message, may mutate that model under Updex's convention and call
permitted deterministic functions, and return only `undefined`, one command, or an
array of commands. Transition configuration belongs in model or message.

Each exec factory is a `const` arrow function directly annotated to return
`UpdexExec<CommandEvent, Result>` for exactly one command event. No per-command
exec return aliases in `model.ts`. Exec props describe injected capabilities,
not return contracts. Execs receive commands, not models, and asynchronously
return no message, one message, or an array of messages. API
boundaries may retain domain-specific single-response contracts. These input
restrictions apply to declared contracts even without branching on `msg.name` or
`cmd.name`.

Distinct-event unions are complete module/responsibility aggregates. Handler union
results use the owner's complete aggregate; parents reuse child aggregates rather
than expand their members. No subset unions or handler-only aggregates. Keep
Updex's optional `| undefined`; other domain-value unions are unaffected. `UpdexUpdates`/
`UpdexExecs` map each event name to its individual handler. Named aggregate exec
registries and API maps remain allowed, with direct `UpdexExec` entries rather
than individual exec aliases.

### Environmental work and completion

Updates must not access environmental state or invoke environmental capabilities,
even synchronously. Route environmental computation/cancellation, Promise-returning
operations, waits/deferred work, timers/subscriptions, network/API access,
persistence, completion-producing operations, and app work ordered after the view
callback through commands and execs. This permits asynchronous substitution;
internal presentation scheduling follows its separate rules below.

When a transition depends on an environmental result, its exec returns a completion
message. The owning domain decides whether the update validates it before dependent
mutation: validate when business rules require checks (for example, untrusted
input or results that may be stale or violate invariants), but not redundantly when
the contract and reachable states guarantee validity. User-input transitions may
need checks. Expected recoverable failures use the ordinary result when the domain
contract defines one; unexpected exceptions follow existing runtime behavior. Do
not add transaction, rollback, global-error, or generic-result abstractions.

Execs may invoke synchronous capabilities; updates must not. Such capabilities
must not start untracked deferred work, reenter the runtime, render presentation,
mutate or retain supplied models/nested model-owned values or put those references
in retained external state. Work outliving a call uses detached inputs. Do not add
generic synchronous-capability types, mapped-type enforcement, mandatory
`undefined` returns, or lint infrastructure for these rules.

Runtime cycle order is update, synchronous view-callback invocation, then commands
in array order without awaiting earlier commands. Dispatch returned messages
sequentially, each with its own update and view invocation before the next.
Asynchronous dependencies use completion messages; apps own stale-result handling.

### Runtime delegation

Updates must not invoke other update implementations by direct call, forwarded
callback, stored closure, factory-supplied function, message-name routing, or
generic dispatcher outside the runtime. App, screen, and nested responsibilities
coordinate through runtime-dispatched messages and commands.

Execs must not invoke, wrap, chain, or delegate to other runtime execs. They use
injected capabilities for their own responsibility; cross-responsibility async
coordination uses commands/completions. The only wrapping exception is
[API wrappers](#api-exec-wrappers-and-transport). Generic runtime/transport
dispatch of registered handlers is not implementation-level delegation.

### API exec wrappers and transport

Owner-specific `api.ts` owns wrapper factories, private command/response schemas,
and optional aggregate API maps. Wrappers follow [handler contracts](#handler-contracts),
including complete owner message aggregates. Put each wrapper's props type
immediately above it; it contains only that wrapper's injected call capability.

Keep schemas/parsing inside the factory. Parse the incoming command before passing
it to the call capability. For message-producing commands, parse and return its
result; for no-message commands, invoke the capability and return no message (no
response schema required). Do not export parsing helpers, bypass parsing with
assertions, or parse/rebuild domain messages in composition.

The owner contract defines expected validation/downstream failures; map them to
its documented result when one exists. Unexpected exceptions follow runtime
behavior. No universal failure message or swallowing policy is imposed.

Use one environment-neutral wrapper per owner command, with no client/server
variants. Composition supplies the matching owner exec or generic transport such
as `callApi`. This sole exec-wrapping exception must not import/select another
exec, dispatch through aggregate registries, or construct domain messages.

Generic API client/server adapters only route/serialize wire data. They may decode
JSON and represent no-message responses by transport convention, but must not
validate domain commands/messages, select domain failures, or construct messages.
App may aggregate owner API maps without transferring handler ownership.

## Persistence and presentation

### Persistence

Persistence stores application/domain data outside the in-memory model for later
retrieval, including browser storage, remote key-value stores, databases, and files.
Every persistence capability returns a Promise regardless of name or implementation,
including `localStorage`. Runtime use requires commands/execs; composition may
await persistence during initialization. Updates must not invoke persistence,
declare it as a direct dependency, or discard its Promise.

Active browser/platform handles, renderer/GPU resources, computation caches,
buffered events/status transitions, adapter lifecycle state, pending waits, and
cancellation state are transient under their lifecycle contracts. Surviving
updates alone does not make state persistent; renaming an operation does not
change its classification.

### Presentation and lifecycle

Views derive presentation, select/dispatch messages, and handle local events
including `preventDefault`. They must not perform domain transitions, access
persistent services, or subscribe globally while rendering. Keep element-scoped
interaction handlers in their owning view. App owns global input coordination,
environmental subscriptions, mounting, and concrete renderer lifecycle; it may
use adapters to subscribe to and route global events.

Runtime and exported `View.tsx` views use `UpdexViewProps<TModel, TMsg>` from
`updex/model`, with only `model` and `dispatch`. Consume the owning app/screen
model directly, without presentation models or copies, children, slots, callbacks,
arbitrary wrappers, or layout props. Compose explicitly with
`<ChildView model={model} dispatch={dispatch} />`; structural wrappers belong
inside their owning view.

The runtime invokes the synchronous view callback with post-update state—not a
guaranteed detached snapshot or transactional commit—and does not await rendering.
Returning guarantees neither DOM commitment, GPU completion, browser paint, nor
display. Projects choose presentation ordering and redraw policy, including whether
to defer, batch, or omit output. These choices do not change runtime message
dispatch, view callback invocation, command ordering, or explicit lifecycle and
completion contracts.

Internal presentation scheduling needs no domain commands/execs, but does not relax
update, ownership, or lifecycle restrictions. Consumers requiring
completion need an explicitly guaranteeing capability; command order alone is
insufficient. Startup work requiring mounted DOM depends on an explicit
presentation-adapter initial-mount guarantee. Async app dependencies follow the
[command and completion rules](#environmental-work-and-completion).

Resource lifecycle callbacks report through a wait capability, never by drawing or
dispatching messages directly. Normal runtime view invocations supply current
inputs. Resource restoration completes before reporting; generation checks reject
obsolete callbacks after failure or replacement. Environmental measurements follow the
[command and completion rules](#environmental-work-and-completion).

## Naming and ordering

### Contract member naming

Public repository-owned domain identifiers must use an ownership prefix. This
includes exported domain types, interfaces, models, nested model shapes,
unions, payloads, results, `*Props` contracts, factories, views, domain
helpers, and adapter contracts. Domain members such as model fields,
capability members, message fields, and payload/result fields keep their
ownership prefix wherever they are used.

Private implementation identifiers are prefixless. This includes function
and callback parameters, local and destructured bindings, catch bindings,
unexported module-level variables and constants, unexported helpers and types,
and explicitly private class members. Parameter names remain private even in
exported functions and contract signatures. Private identifiers may be reused
in separate functions and methods; they need only be unambiguous in their
actual scope. Preserve object literal keys and non-private property names.

- `app/<area>` uses `app<Area>...`; `screens/<screen>` uses
  `screen<Screen>...`. Convert kebab-case and snake_case to PascalCase and
  append nested responsibilities after the owner prefix.
- Root app modules and app-wide adapters use `app...`; screen contracts use the
  screen namespace. Adapters inherit the namespace of the consumer contract
  they implement. Moving a file does not rename a domain contract.
- Equivalent capabilities use one identical member name across consumer,
  adapter, and composition. Exec factories, props, capabilities, API contracts,
  and adapters use their conceptual owner's namespace.
- Generic implementation locals and implementation-only platform details are
  prefixless unless an exception below applies.

Explicit exceptions are Updex envelope fields such as `model`, `msg`,
`data`, and `name`; TEA message and command `name` literals and registry
keys; browser, DOM, Web API, server-runtime, and external-library members; externally
mandated wire-format fields; CSS properties, custom properties, class names,
DOM attributes, and persisted storage keys; `MainCfg`, `__MAIN_CFG__`, and
`main`; generic locals; server runtime `Env`; and the generic transport
capability `callApi`. Domain-specific API fields and capabilities remain
prefixed.

### Name ordering

Use ascending, case-sensitive, locale-independent lexical order for names in
source and structured configuration, using JavaScript string comparison (`<`
and `>`) without locale collation.

- Sort TypeScript, TSX, JavaScript, and JSX imports and exports by module path
  or exported name, and sort named top-level declarations by name.
- In TypeScript, TSX, JavaScript, and JSX source files, including tests, keep
  leading triple-slash directives together, then put exactly one blank line
  between that directive block and the first import. Keep the leading import
  block together without blank lines between imports. Put exactly one blank
  line after the final import and before the first top-level code statement.
  Put exactly one blank line between adjacent top-level code statements,
  including declarations and executable statements. Class and type members,
  object properties, and nested statements are outside this rule. Keep
  same-name overload signatures together with no blank line between them. Keep
  a `*Props` type alias or interface immediately above its consuming function
  with no blank line between them. This is a review convention; Prettier does
  not enforce or insert these blank lines.
- Sort type and interface members, class members, and explicit object-literal
  properties by their property or member names. Sort computed object properties
  by the source text of their key expression. Put object-literal spread
  expansions after explicit properties and sort them separately by expression
  text. Sort object keys in JSON, JSONC, YAML, and recognized extensionless
  structured configuration such as `.prettierrc`.
- Treat a `*Props` type alias or interface immediately above its consuming
  function as one ordering unit keyed by that function's name.
- Keep function-body statements and arrays in their logical sequence. Do not
  rely on import order, declaration order, object property evaluation order, or
  object key enumeration order for behavior; move required sequencing into
  explicit functions or other ordered statements. Materialize spread sources
  in their original sequence when their evaluation or enumeration has
  observable effects, then preserve intended override results in the sorted
  object.
- Apply the convention to eligible source and configuration files, including
  tests. Exclude lockfiles and generated or vendored content.

## Review and maintenance

### Review evidence

Each finding reports file/line, applicable rule, concrete import/contract/factory
or reachable-transition evidence, why invalid, and the smallest correction.
Filter the [naming exceptions](#contract-member-naming) before reporting names.
Distinguish architectural violations from implementation conventions.

- **Coupling:** trace imports/re-exports and contract ownership; invocation
  direction alone is insufficient.
- **Dependencies:** identify the consumer's declared unrelated requirement.
  Complete-model parameters alone are not interface-segregation violations;
  show unrelated semantic coupling, retention, or mutation. Extra fields forwarded
  to correctly narrowed parameters are not declared dependencies.
- **Updates:** identify reachable prohibited behavior: props/factory construction,
  hidden environmental access, Promise invocation, persistence, deferred work,
  model/nested-reference retention, adapter-side model mutation, reentrancy,
  rendering/resource management, invalid failure/mutation ordering, or unrelated
  dependency coupling.
- **Handler contracts:** cite the declared contract against every
  [handler requirement](#handler-contracts), regardless of branching on event names.
  Include invalid event/result unions and parents expanding child aggregates.
  Recommend direct update values, directly annotated exec factories, and complete
  reusable owner aggregates. Do not flag optional `| undefined`, domain-value unions,
  or aggregate registries/API maps with direct `UpdexExec` entries.
- **False positives:** an injected synchronous capability called by an exec, its
  complete-model parameter, an app-placed implementation of a screen capability,
  intentional command boundaries around synchronous work, transient state spanning
  updates, or wider objects passed to narrow exec props are not violations alone.
  Synchronous environmental work inside an update still violates its boundary.
- **Presentation:** presentation ordering within a view callback and redraw choices
  are not findings by themselves. Report runtime cycle ordering violations, broken
  explicit lifecycle or completion contracts, or dependence on unguaranteed
  completion. Do not require synchronous flush without a specific completion
  requirement.
- **Substitution:** identify documented behavior and an incompatible implementation;
  compatible TypeScript shape is insufficient.
- **Forwarding:** identify overlapping fields; distinguish factory forwarding from
  explicit view prop selection.
- **Allowlist:** identify the proposed/added unapproved form and the smallest
  correction: an allowed form or an explicit guideline amendment.
- **Proliferation:** identify the proposed/added file or directory, viable existing
  owner, unjustified separation rationale, and smallest consolidation. An
  evidence-backed split with an unapproved form is an allowlist issue, not
  proliferation. Required adapter/dependency-boundary moves are not proliferation.
- **Import paths:** search TS, TSX, and configuration module specifiers for `#/`
  and `..` path segments; reject parent traversal except adapter type-only imports
  of consumer-owned contracts, catch-all aliases, stale `#/screens/...` specifiers
  that do not resolve to screen modules. Valid `./` and non-module paths are fine.
- **Naming:** check conceptual ownership, nested shapes, intersections, spreads,
  factories, views, helpers, and returned capabilities.

### Tests

Agents must not create or modify tests unless the user's task explicitly
requests test changes. Running existing tests and validation commands remains
allowed.

### Validation and maintenance

Every repository change must pass:

```sh
pnpm fmt && pnpm check
```

Run this command from the repository root. `pnpm fmt` intentionally formats
the workspace before checks run; do not otherwise use write-mode
formatters during review or validation unless formatting was explicitly
requested. Keep this file focused on reusable invariants, use fictional
examples, and do not add vendor-specific skill, plugin, activation, or
installation instructions.
