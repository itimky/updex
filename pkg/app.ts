import type {
  UpdexCmd,
  UpdexExec,
  UpdexMsg,
  UpdexUpdate,
  UpdexUpdateProps,
  UpdexViewProps,
} from './model.ts'

export type UpdexAppProps<
  TModel extends object,
  TMsg extends UpdexMsg<string, object | undefined>,
  TCmd extends UpdexCmd<string, object | undefined>,
> = {
  execs: {
    [TName in TCmd['name']]: UpdexExec<
      Extract<TCmd, { name: TName }>,
      TMsg | undefined
    >
  }
  trace?(...args: UpdexAppTraceArgs<TMsg, TCmd>): void
  updates: {
    [TName in TMsg['name']]: UpdexUpdate<
      TModel,
      Extract<TMsg, { name: TName }>,
      TCmd | undefined
    >
  }
  view: (props: UpdexViewProps<TModel, TMsg>) => void
  withModel<TResult>(fn: (model: TModel) => TResult): TResult
}

export type UpdexAppTraceArgs<
  TMsg extends UpdexMsg<string, object | undefined>,
  TCmd extends UpdexCmd<string, object | undefined>,
> = {
  [TKind in UpdexAppTraceKind]: [
    kind: TKind,
    evt: UpdexAppTraceEvt<TMsg, TCmd, TKind>,
  ]
}[UpdexAppTraceKind]

export type UpdexAppTraceEvt<
  TMsg extends UpdexMsg<string, object | undefined>,
  TCmd extends UpdexCmd<string, object | undefined>,
  TKind extends UpdexAppTraceKind,
> = TKind extends 'RegisterMsg' | 'RegisterCmd'
  ? string
  : TKind extends 'Dispatch' | 'MsgIn' | 'MsgOut'
    ? TMsg
    : TKind extends 'Enqueue' | 'CmdIn' | 'CmdOut'
      ? TCmd
      : never

export type UpdexAppTraceKind =
  | 'RegisterMsg'
  | 'RegisterCmd'
  | 'Dispatch'
  | 'Enqueue'
  | 'MsgIn'
  | 'MsgOut'
  | 'CmdIn'
  | 'CmdOut'

export function createUpdexApp<
  TModel extends object,
  TMsg extends UpdexMsg<string, object | undefined>,
  TCmd extends UpdexCmd<string, object | undefined>,
>(props: UpdexAppProps<TModel, TMsg, TCmd>) {
  const msgBus = new EventTarget()
  for (const [name, update] of Object.entries(props.updates)) {
    props.trace?.('RegisterMsg', name)
    msgBus.addEventListener(name, (event) =>
      onMsg(
        (event as CustomEvent<TMsg>).detail,
        update as (
          props: UpdexUpdateProps<TModel, TMsg>,
        ) => TCmd | readonly TCmd[] | undefined,
      ),
    )
  }
  const cmdBus = new EventTarget()
  for (const [name, exec] of Object.entries(props.execs)) {
    props.trace?.('RegisterCmd', name)
    cmdBus.addEventListener(name, (event) =>
      onCmd(
        (event as CustomEvent<TCmd>).detail,
        exec as (cmd: TCmd) => Promise<TMsg | readonly TMsg[] | undefined>,
      ),
    )
  }
  function onMsg(
    msg: TMsg,
    update: (
      props: UpdexUpdateProps<TModel, TMsg>,
    ) => TCmd | readonly TCmd[] | undefined,
  ) {
    props.trace?.('MsgIn', msg)
    const result = props.withModel((model) => {
      const result = update({ model, msg })
      props.view({ dispatch, model })
      return result
    })
    const cmds: readonly TCmd[] = result
      ? 'name' in result
        ? [result]
        : result
      : []
    for (const cmd of cmds) {
      props.trace?.('CmdOut', cmd)
      cmdBus.dispatchEvent(new CustomEvent(cmd.name, { detail: cmd }))
    }
  }
  async function onCmd(
    cmd: TCmd,
    exec: (cmd: TCmd) => Promise<TMsg | readonly TMsg[] | undefined>,
  ) {
    props.trace?.('CmdIn', cmd)
    const result = await exec(cmd)
    const msgs =
      result === undefined ? [] : Array.isArray(result) ? result : [result]
    for (const msg of msgs) {
      props.trace?.('MsgOut', msg)
      msgBus.dispatchEvent(new CustomEvent(msg.name, { detail: msg }))
    }
  }
  function dispatch(msg: TMsg) {
    props.trace?.('Dispatch', msg)
    msgBus.dispatchEvent(new CustomEvent(msg.name, { detail: msg }))
  }
  return {
    enqueue(...cmds: TCmd[]) {
      for (const cmd of cmds) {
        props.trace?.('Enqueue', cmd)
        cmdBus.dispatchEvent(new CustomEvent(cmd.name, { detail: cmd }))
      }
    },
    run() {
      props.withModel((model) => props.view({ dispatch, model }))
    },
  }
}
