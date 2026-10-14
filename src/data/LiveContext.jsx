import { createContext, useContext, useEffect, useReducer, useState } from 'react'
import { source } from './source'
import { initialState, reduce } from './store'

const Ctx = createContext(null)
const r = (s, a) => (a.init ? a.init : reduce(s, a.e))

export function LiveProvider({ children }) {
  const [state, dispatch] = useReducer(r, null)
  const [error, setError] = useState(null)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    let stop = () => {}, alive = true
    source.load().then(({ world, history }) => {
      if (!alive) return
      dispatch({ init: history.reduce(reduce, initialState(world)) })
      stop = source.subscribe(world, (e) => dispatch({ e }))
    }).catch((e) => setError(e.message))
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => { alive = false; stop(); clearInterval(t) }
  }, [])
  return <Ctx.Provider value={{ state, error, now, kind: source.kind }}>{children}</Ctx.Provider>
}
export const useLive = () => useContext(Ctx)
