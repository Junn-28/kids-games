/* セーブデータの読み書き。
   保存先は localStorage だけ。サーバーには なにも送らない。

   ・保存できない環境（プライベートモード、容量オーバー、Cookie無効）でも
     例外を投げずに「保存なし」として動く。ゲームは遊べるままにする。
   ・読み込んだ値は信用しない。呼び出し側で必ず範囲チェックすること。 */

const MAX_BYTES = 64 * 1024; // 壊れた・肥大したデータを書き込まないための上限

const backend = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null; // Cookie無効時などは localStorage へのアクセス自体が throw する
  }
};

export function createSave(key) {
  return {
    /* 保存されている生オブジェクトを返す。無ければ null */
    load() {
      const store = backend();
      if (!store) return null;
      try {
        const raw = store.getItem(key);
        if (!raw || raw.length > MAX_BYTES) return null;
        const data = JSON.parse(raw);
        return data && typeof data === "object" && !Array.isArray(data) ? data : null;
      } catch {
        return null; // 壊れていたら「セーブなし」＝最初から
      }
    },

    /* 保存できたら true */
    save(obj) {
      const store = backend();
      if (!store) return false;
      try {
        const raw = JSON.stringify(obj);
        if (raw.length > MAX_BYTES) return false;
        store.setItem(key, raw);
        return true;
      } catch {
        return false;
      }
    },

    clear() {
      const store = backend();
      if (!store) return;
      try {
        store.removeItem(key);
      } catch {
        /* むし */
      }
    },

    get available() {
      return backend() !== null;
    },
  };
}

/* 数値を必ず有限＆範囲内にして返す。セーブデータの検証用 */
export const safeNum = (v, min, max, dflt = min) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
};
