interface Options {
    compare?: 'lines' | 'words' | 'chars';
    ignoreWhitespace?: false,

    splitLinesRegex?: string;
    splitWordsRegex?: string;
    splitCharsRegex?: string;
}

interface MyersDiff {
    diff(lhs: string, rhs: string, options?: Options): any;
}
const {diff} = require('myers-diff').default as MyersDiff;

export default diff;