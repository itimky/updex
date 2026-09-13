type Evt<TName, TData> = TData extends undefined
  ? Readonly<{
      name: TName
    }>
  : Readonly<{
      data: Readonly<TData>
      name: TName
    }>

export type UpdexCmd<TName, TData = undefined> = Evt<TName, TData>

export type UpdexExec<
  TCmd extends UpdexCmd<string, object | undefined>,
  TMsg extends UpdexMsg<string, object | undefined> | undefined = undefined,
> = (
  cmd: TCmd,
) => Promise<
  [TMsg] extends [undefined]
    ? undefined
    : TMsg | readonly Exclude<TMsg, undefined>[]
>

export type UpdexMsg<TName, TData = undefined> = Evt<TName, TData>

export type UpdexUpdate<
  TModel extends object | undefined,
  TMsg extends UpdexMsg<string, object | undefined>,
  TCmd extends undefined | UpdexCmd<string, object | undefined> = undefined,
> = (
  props: UpdexUpdateProps<TModel, TMsg>,
) => [TCmd] extends [undefined]
  ? undefined
  : TCmd | readonly Exclude<TCmd, undefined>[]

export type UpdexUpdateProps<
  TModel extends object | undefined,
  TMsg extends UpdexMsg<string, object | undefined>,
> = {
  model: TModel
  msg: TMsg
}

export type UpdexViewProps<
  TModel extends object,
  TMsg extends UpdexMsg<string, object | undefined>,
> = {
  dispatch(msg: TMsg): void
  model: TModel
}
