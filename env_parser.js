//if you need to change this code, plz go check if the dotenv library supports multiline values between double qoutes and use that instead
const regex = /(?<key>[a-zA-Z0-9_]+)=(?:(?<!\\)(?:"(?<value2>(?:.|\n)*?)(?<!\\)")|'?(?<value1>.*)'?)/gm

export const parse = (val) => {
    let matches = val.matchAll(regex);
    let obj = {}
    for(const match of matches){
        obj[match.groups.key] = (match.groups.value2 || match.groups.value1).trim()
    }
    return obj
}