//if you need to change this code, plz go check if the dotenv library supports multiline values between double qoutes and use that instead
const regex = /(?<key>[a-zA-Z0-9_]+)=(?<value>(?<!\\)(?:"(?:(?:.|\n)*?)(?<!\\)")|'?(?:.*)'?)/gm

export const parse = (val) => {
    let matches = val.matchAll(regex);
    let obj = {}
    for(const match of matches){
        let result = match.groups.value.trim()
        if(result[0] === '"' || result[0] === "'") {
            result = JSON.parse(result)
        }
        obj[match.groups.key] = result
    }
    return obj
}