/**
 * Read tool_result content intern pool.
 *
 * 1.6.237 后实测：同一 .jsx 文件被 87 个 SubAgent / 父 user message 各持一份完整副本（30MB+ 重复）。
 * 对 Read 工具的 resultText 做 content-addressed dedup，让相同内容共享同一字符串引用。
 * hash 仅用 length + 前 64 / 后 64 字符避免大字符串 O(n) hash；碰撞概率极低
 * （要求 length + 边界两端共 128 字节全匹配且中段不同）。
 *
 * 抽到独立模块（无外部依赖）便于 node --test 直接 import，避免被
 * toolResultBuilder.js 的传递依赖（./helpers 无 .js 后缀）污染。
 */

const _MAX_READ_POOL_SIZE = 1000;
const _MIN_DEDUP_LEN = 256;
const _readResultPool = new Map();

function _readResultSig(s) {
  return s.length + ':' + s.slice(0, 64) + ':' + s.slice(-64);
}

/**
 * 把 Read 工具的 resultText 替换为 pool 中的共享引用（命中时）或注册新值。
 * 短字符串（< 256）跳过 dedup（不值得 sig 开销）。
 *
 * @param {string} s - resultText 原文
 * @returns {string} 池化后的字符串引用
 */
export function internReadResult(s) {
  if (typeof s !== 'string' || s.length < _MIN_DEDUP_LEN) return s;
  const sig = _readResultSig(s);
  const pooled = _readResultPool.get(sig);
  if (pooled !== undefined) return pooled;
  if (_readResultPool.size >= _MAX_READ_POOL_SIZE) {
    _readResultPool.delete(_readResultPool.keys().next().value);
  }
  _readResultPool.set(sig, s);
  return s;
}

/** 测试辅助：清空 Read intern pool。 */
export function _resetReadPoolForTest() {
  _readResultPool.clear();
}

/** 测试辅助：观察 pool 当前 size。 */
export function _getReadPoolSizeForTest() {
  return _readResultPool.size;
}
