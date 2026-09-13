import { type UpdexAppTraceArgs, createUpdexApp } from './app.ts'
import type { UpdexCmd, UpdexMsg, UpdexViewProps } from './model.ts'
import { describe, expect, it, vi } from 'vitest'

type Cmd = UpdexCmd<'load'> | UpdexCmd<'save', { value: number }>

type Model = { value: number }

type Msg = UpdexMsg<'add', { amount: number }> | UpdexMsg<'reload'>

describe('createUpdexApp', () => {
  it('renders on run and applies view-dispatched messages to the current model synchronously', () => {
    let model: Model = { value: 2 }
    const rendered: number[] = []
    const view = vi.fn((props: UpdexViewProps<Model, Msg>) => {
      rendered.push(props.model.value)
    })
    const app = createUpdexApp<Model, Msg, never>({
      execs: {},
      updates: {
        add: ({ model, msg }) => {
          model.value += msg.data.amount
        },
        reload: () => {},
      },
      view,
      withModel: (fn) => fn(model),
    })

    expect(view).not.toHaveBeenCalled()
    app.run()
    expect(rendered).toEqual([2])
    const { dispatch } = view.mock.calls[0]![0]

    dispatch({ data: { amount: 3 }, name: 'add' })
    expect(model.value).toBe(5)
    expect(rendered).toEqual([2, 5])

    model = { value: 10 }
    dispatch({ data: { amount: 4 }, name: 'add' })
    dispatch({ name: 'reload' })
    expect(model.value).toBe(14)
    expect(rendered).toEqual([2, 5, 14, 14])
  })

  it('routes an enqueued command through its completion update, view, and follow-up command', async () => {
    const loaded = Promise.withResolvers<Msg>()
    const saved = Promise.withResolvers<number>()
    const model: Model = { value: 0 }
    const events: string[] = []
    const app = createUpdexApp<Model, Msg, Cmd>({
      execs: {
        load: () => {
          events.push('load')
          return loaded.promise
        },
        save: async (cmd) => {
          events.push(`save:${cmd.data.value}`)
          saved.resolve(cmd.data.value)
        },
      },
      updates: {
        add: ({ model, msg }) => {
          events.push(`add:${msg.data.amount}`)
          model.value += msg.data.amount
          return { data: { value: model.value }, name: 'save' }
        },
        reload: () => ({ name: 'load' }),
      },
      view: ({ model }) => {
        events.push(`view:${model.value}`)
      },
      withModel: (fn) => fn(model),
    })

    app.enqueue({ name: 'load' })
    expect(events).toEqual(['load'])
    expect(model.value).toBe(0)

    loaded.resolve({ data: { amount: 7 }, name: 'add' })
    expect(await saved.promise).toBe(7)
    expect(events).toEqual(['load', 'add:7', 'view:7', 'save:7'])
    expect(model.value).toBe(7)
  })

  it('starts commands in array order after the view without waiting for earlier commands', async () => {
    const loaded = Promise.withResolvers<Msg>()
    const rendered = Promise.withResolvers<void>()
    const model: Model = { value: 0 }
    const events: string[] = []
    const view = vi.fn((props: UpdexViewProps<Model, Msg>) => {
      events.push(`view:${props.model.value}`)
      if (props.model.value === 5) rendered.resolve()
    })
    const app = createUpdexApp<Model, Msg, Cmd>({
      execs: {
        load: () => {
          events.push('load')
          return loaded.promise
        },
        save: async (cmd) => {
          events.push(`save:${cmd.data.value}`)
        },
      },
      updates: {
        add: ({ model, msg }) => {
          events.push('add')
          model.value += msg.data.amount
        },
        reload: () => {
          events.push('reload')
          return [{ name: 'load' }, { data: { value: 0 }, name: 'save' }]
        },
      },
      view,
      withModel: (fn) => fn(model),
    })
    app.run()
    events.length = 0

    view.mock.calls[0]![0].dispatch({ name: 'reload' })
    expect(events).toEqual(['reload', 'view:0', 'load', 'save:0'])

    loaded.resolve({ data: { amount: 5 }, name: 'add' })
    await rendered.promise
    expect(events).toEqual([
      'reload',
      'view:0',
      'load',
      'save:0',
      'add',
      'view:5',
    ])
  })

  it('gives every message in an exec result its own update, view, and command cycle', async () => {
    const saved = Promise.withResolvers<void>()
    const saving = Promise.withResolvers<undefined>()
    const model: Model = { value: 0 }
    const events: string[] = []
    const messages: readonly Msg[] = [
      { data: { amount: 2 }, name: 'add' },
      { data: { amount: 3 }, name: 'add' },
    ]
    const app = createUpdexApp<Model, Msg, Cmd>({
      execs: {
        load: async () => messages,
        save: (cmd) => {
          events.push(`save:${cmd.data.value}`)
          if (cmd.data.value === 5) saved.resolve()
          return saving.promise
        },
      },
      updates: {
        add: ({ model, msg }) => {
          events.push(`add:${msg.data.amount}`)
          model.value += msg.data.amount
          return { data: { value: model.value }, name: 'save' }
        },
        reload: () => {},
      },
      view: ({ model }) => {
        events.push(`view:${model.value}`)
      },
      withModel: (fn) => fn(model),
    })

    app.enqueue({ name: 'load' })
    await saved.promise
    expect(events).toEqual([
      'add:2',
      'view:2',
      'save:2',
      'add:3',
      'view:5',
      'save:5',
    ])
    expect(model.value).toBe(5)
    saving.resolve(undefined)
    await saving.promise
  })

  it.each([undefined, []])(
    'does not dispatch or render when an exec returns %j',
    async (result) => {
      const completed = Promise.withResolvers<Msg | Msg[] | undefined>()
      const update = vi.fn()
      const view = vi.fn()
      const app = createUpdexApp<Model, Msg, UpdexCmd<'load'>>({
        execs: { load: () => completed.promise },
        updates: { add: update, reload: update },
        view,
        withModel: (fn) => fn({ value: 0 }),
      })

      app.enqueue({ name: 'load' })
      completed.resolve(result)
      await completed.promise
      expect(update).not.toHaveBeenCalled()
      expect(view).not.toHaveBeenCalled()
    },
  )

  it('still renders an update that returns an empty command array', () => {
    const model: Model = { value: 0 }
    const load = vi.fn(async () => undefined)
    const view = vi.fn((props: UpdexViewProps<Model, Msg>) => props.model.value)
    const app = createUpdexApp<Model, Msg, UpdexCmd<'load'>>({
      execs: { load },
      updates: {
        add: ({ model, msg }) => {
          model.value += msg.data.amount
          return []
        },
        reload: () => {},
      },
      view,
      withModel: (fn) => fn(model),
    })
    app.run()

    view.mock.calls[0]![0].dispatch({ data: { amount: 3 }, name: 'add' })
    expect(view.mock.results.map((result) => result.value)).toEqual([0, 3])
    expect(load).not.toHaveBeenCalled()
  })

  it('traces registration, public inputs, and internally produced events', async () => {
    const loaded = Promise.withResolvers<Msg>()
    const saved = Promise.withResolvers<void>()
    const model: Model = { value: 0 }
    const traces: UpdexAppTraceArgs<Msg, Cmd>[] = []
    const view = vi.fn((props: UpdexViewProps<Model, Msg>) => props.model.value)
    const app = createUpdexApp<Model, Msg, Cmd>({
      execs: {
        load: () => loaded.promise,
        save: async () => {
          saved.resolve()
        },
      },
      trace: (...args) => {
        traces.push(args)
      },
      updates: {
        add: ({ model, msg }) => {
          model.value += msg.data.amount
          return { data: { value: model.value }, name: 'save' }
        },
        reload: () => ({ name: 'load' }),
      },
      view,
      withModel: (fn) => fn(model),
    })

    expect(traces).toHaveLength(4)
    expect(traces).toEqual(
      expect.arrayContaining([
        ['RegisterMsg', 'add'],
        ['RegisterMsg', 'reload'],
        ['RegisterCmd', 'load'],
        ['RegisterCmd', 'save'],
      ]),
    )
    traces.length = 0
    app.run()
    expect(traces).toEqual([])

    view.mock.calls[0]![0].dispatch({ name: 'reload' })
    const message: Msg = { data: { amount: 4 }, name: 'add' }
    loaded.resolve(message)
    await saved.promise
    const command: Cmd = { data: { value: 4 }, name: 'save' }
    expect(traces).toEqual([
      ['Dispatch', { name: 'reload' }],
      ['MsgIn', { name: 'reload' }],
      ['CmdOut', { name: 'load' }],
      ['CmdIn', { name: 'load' }],
      ['MsgOut', message],
      ['MsgIn', message],
      ['CmdOut', command],
      ['CmdIn', command],
    ])

    traces.length = 0
    app.enqueue(command)
    expect(traces).toEqual([
      ['Enqueue', command],
      ['CmdIn', command],
    ])
  })
})
