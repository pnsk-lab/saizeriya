import { describe, it, expect } from "bun:test"
import { createQueueLocker } from "./queue-locker"

describe("createQueueLocker", () => {
  it("runs queued tasks sequentially", async () => {
    const queue = createQueueLocker()
    const events: string[] = []
    let releaseFirst: () => void = () => {}
    const waitFirst = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })

    const first = queue(async () => {
      events.push("start1")
      await waitFirst
      events.push("end1")
      return 1
    })
    const second = queue(async () => {
      events.push("start2")
      return 2
    })

    await Promise.resolve()
    expect(events).toEqual(["start1"])

    releaseFirst()
    await first
    await second

    expect(events).toEqual(["start1", "end1", "start2"])
  })

  it("continues after a rejected task", async () => {
    const queue = createQueueLocker()

    const first = queue(async () => {
      throw new Error("fail")
    })
    const second = queue(async () => "ok")

    await expect(first).rejects.toThrow("fail")
    await expect(second).resolves.toBe("ok")
  })
})
