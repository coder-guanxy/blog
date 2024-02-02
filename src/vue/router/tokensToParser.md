# token 转

`/user/:username` - 传入参数也是 `pathTotoken` 函数生成的结果

```js
[
  [
      {
          "type": "Static",
          "value": "user"
      }
  ],
  [
      {
          "type": "Param",
          "value": "username",
          "regexp": "",
          "repeatable": false,
          "optional": false
      }
  ]
]
```

```js
// 配置
const BASE_PATH_PARSER_OPTIONS = {
  sensitive: false, // 灵活的
  strict: false, // 严格模式
  start: true, // 开始
  end: true, // 结束
}

const TokenType = {
  Static: "Static",
  Param: "Param",
  Group: "Group",
}

const TokenizerState = {
  Static: "Static",
  Param: "Param",
  ParamRegExp: "ParamRegExp", // custom re for a param
  ParamRegExpEnd: "ParamRegExpEnd", // check if there is any ? + *
  EscapeNext: "EscapeNext",
}

const _multiplier = 10;
const PathScore = {
  _multiplier : _multiplier,
  Root : 9 * _multiplier, // just /
  Segment : 4 * _multiplier, // /a-segment
  SubSegment : 3 * _multiplier, // /multiple-:things-in-one-:segment
  Static : 4 * _multiplier, // /static
  Dynamic : 2 * _multiplier, // /:someId
  BonusCustomRegExp : 1 * _multiplier, // /:someId(\\d+)
  BonusWildcard : -4 * _multiplier - _multiplier, // /:namedWildcard(.*) we remove the bonus added by the custom regexp
  BonusRepeatable : -2 * _multiplier, // /:w+ or /:w*
  BonusOptional : -0.8 * _multiplier, // /:w? or /:w*
  // these two have to be under 0.1 so a strict /:page is still lower than /:a-:b
  BonusStrict : 0.07 * _multiplier, // when options strict: true is passed, as the regex omits \/?
  BonusCaseSensitive : 0.025 * _multiplier, // when options strict: true is passed, as the regex omits \/?
}

// 特殊
const REGEX_CHARS_RE = /[.+*?^${}()[\]/\\]/g


function tokensToParser( segments, extraOptions) {
  // 合并配置
  const options = Object.assign({}, BASE_PATH_PARSER_OPTIONS, extraOptions)

  // 等级
  const score = []

  // 正则匹配开始
  let pattern = options.start ? '^' : ''

  // keys
  const keys = []

  // 循环 tokens
  // 这里可以优化，因为是正则，所以可以提前计算好正则
  for (const segment of segments) {
    // 计算分数
    const segmentScores = segment.length ? [] : [PathScore.Root]

    if (options.strict && !segment.length) pattern += '/';

    // [{type: TokenType.Static, value: "user"}], 
    for (let tokenIndex = 0; tokenIndex < segment.length; tokenIndex++) {

      // token
      const token = segment[tokenIndex]

      // 等级 
      let subSegmentScore =
        PathScore.Segment +
        (options.sensitive ? PathScore.BonusCaseSensitive : 0)

      // 静态
      if (token.type === TokenType.Static) {
        // 如果 tokenIndex 为 0 
        if (!tokenIndex) pattern += '/'
        // 正则 - 特殊字段替换
        pattern += token.value.replace(REGEX_CHARS_RE, '\\$&')
        // + 静态等级
        subSegmentScore += PathScore.Static
      } else if (token.type === TokenType.Param) {
        // 
        const { value, repeatable, optional, regexp } = token
        // 将 token 添加到 keys
        keys.push({
          name: value,
          repeatable,
          optional,
        })

        // BASE_PARAM_PATTERN = '[^/]+?'
        const re = regexp ? regexp : BASE_PARAM_PATTERN

        // 正则
        if (re !== BASE_PARAM_PATTERN) {
          // + 自定义分数
          subSegmentScore += PathScore.BonusCustomRegExp

          // 构建一个正则对象
          try {
            new RegExp(`(${re})`)
          } catch (err) {
            throw new Error(
              `Invalid custom RegExp for param "${value}" (${re}): ` +
                err.message
            )
          }
        }

        // repeatable: char === '*' || char === '+', // 重复标识
        // 根据是否是重复，赋值不同的正则表达式
        let subPattern = repeatable ? `((?:${re})(?:/(?:${re}))*)` : `(${re})`

        // optional: char === '*' || char === '?', // 可选标识
        // 最开始的时候，也就是 tokenIndex === 0 时
        if (!tokenIndex)
          subPattern = optional && segment.length < 2
              ? `(?:/${subPattern})`
              : '/' + subPattern

        // 如果是可选的，并且不是最后一个，则添加一个可选的标识
        if (optional) subPattern += '?'

        // 更新 pattern
        pattern += subPattern

        // 子分段分数
        subSegmentScore += PathScore.Dynamic

        // 更新子分段分数
        if (optional) subSegmentScore += PathScore.BonusOptional
        if (repeatable) subSegmentScore += PathScore.BonusRepeatable
        if (re === '.*') subSegmentScore += PathScore.BonusWildcard
      }
      
      // 更新分段分数
      score.push(segmentScores)
    }

    // 一些传参的特殊情况处理 - 暂不考虑
    if (options.strict && options.end) {
      const i = score.length - 1
      score[i][score[i].length - 1] += PathScore.BonusStrict
    }

    if (!options.strict) pattern += '/?'

    if (options.end) pattern += '$'
    else if (options.strict) pattern += '(?:/|$)'

    // 构建一个正则表达式忽略大小写
    const re = new RegExp(pattern, options.sensitive ? '' : 'i')

    // 解析 path 下面分析
    function parse(path){}

    // 将 params 转为字符串
    function stringify(params){}

    return {
      re, // 构建匹配正则
      score, // 优先级
      keys, //
      parse, // 解析函数
      stringify, // 组合函数
    }
}
}


// /user/:username
tokensToParser([
    [
        {
            "type": "Static",
            "value": "user"
        }
    ],
    [
        {
            "type": "Param",
            "value": "username",
            "regexp": "",
            "repeatable": false,
            "optional": false
        }
    ]
])
```

解析结果为：

```js
{

  "re": /^\/user\?$/i,
  "score": [
      []
  ],
  "keys": []
  "parse": function(){},
  "stringify": function(){}
}
```


## 解析 path 的函数

```js
  // 构建一个正则表达式忽略大小写
  const re = new RegExp(pattern, options.sensitive ? '' : 'i')

  function parse(path) {
    // 正则匹配当前的路径 "xxx".match(/xxx/)
    const match = path.match(re)
    const params = {}

    if (!match) return null

    // 获取匹配到的参数
    for (let i = 1; i < match.length; i++) {
      const value = match[i] || ''
      const key = keys[i - 1]

      // 处理 params
      params[key.name] = value && key.repeatable ? value.split('/') : value
    }

    // 返回正则匹配的参数
    return params
  }
```

## 将 params 转为字符串的函数


```js
  // 构建一个正则表达式忽略大小写
  const re = new RegExp(pattern, options.sensitive ? '' : 'i')


  // {username: "uname"}
  function stringify(params) {
    let path = ''
    // for optional parameters to allow to be empty
    let avoidDuplicatedSlash = false

    // 循环 tokens
    for (const segment of segments) {

      // 
      if (!avoidDuplicatedSlash || !path.endsWith('/')) path += '/'
      avoidDuplicatedSlash = false

      for (const token of segment) {

        // 如果是静态状态，直接拼接
        if (token.type === TokenType.Static) {
          path += token.value

        // 如果是 param 状态，
        } else if (token.type === TokenType.Param) {
          const { value, repeatable, optional } = token

          // 获取 params 中的值
          const param = value in params ? params[value] : ''

          if (isArray(param) && !repeatable) {
            throw new Error(
              `Provided param "${value}" is an array but it is not repeatable (* or + modifiers)`
            )
          }

          // 将 params 转为字符串 
          const text = isArray(param)
            ? param.join('/')
            : param

          // 如果是空值，并且是可选的，则跳过
          if (!text) {
            if (optional) {
              if (segment.length < 2) {
                if (path.endsWith('/')) path = path.slice(0, -1)
                else avoidDuplicatedSlash = true
              }
            } else throw new Error(`Missing required param "${value}"`)
          }

          // path 拼接
          path += text
        }
      }
    }

    // avoid empty path when we have multiple optional params
    return path || '/'
  }
```

比如： `{username: "uname"}` 会拼接为 `/uname`