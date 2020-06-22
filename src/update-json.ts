import diff from './myers-diff';
import crypto from 'crypto';
import fs from 'fs';

const json = JSON.parse(fs.readFileSync('example/test.json', 'utf8'));

const offsets = [58, 188, 246, 499];

type ID = string;

interface Fragment {
    id: ID,
    source: Source,

    end: number,
    start: number,
}

interface Source {
    id: ID,
    contents: ID,
    fragments: Map<ID, Fragment>,
    path: string,
    hash: string,
};

const sources = new Map<ID, Source>();
const fragments = new Map<ID, Fragment>();
let changed = false;

// Read in the files
for(const id of Object.keys(json.sources)){
    const data = json.sources[id];

    const path     = data.path;
    const contents = fs.readFileSync(`example/${path}`, 'utf8');

    const source = {
        id: id,
        contents: contents,
        fragments: new Map,
        hash: data.hash,
        path: path,
    };

    sources.set(id, source);
}

// Assign fragments to each file
for(const id of Object.keys(json.fragments)){
    const data = json.fragments[id];

    const source = sources.get(data.source);

    if(source === undefined){
        throw new Error("Referring to a source that does not exist");
    }
    
    const fragment = {
        id: id,
        source: source,
        start: data.start,
        end: data.end,
    };

    fragments.set(id, fragment);
    source.fragments.set(id, fragment);
}

// Update all files
for(const source of sources.values()){
    // Check if the file has changed
    const hash = crypto.createHash('sha256').update(source.contents).digest("hex");
    if(hash === source.hash){
        continue;
    }
    source.hash = hash;
    changed = true;

    // Construct a list of offsets from all fragments
    const offsets = [];
    const mapping = new Map<number, number>();
    for(const fragment of source.fragments.values()){
        offsets.push(fragment.start);
        offsets.push(fragment.end);
    }

    const previous = fs.readFileSync(`example/${source.path}.previous`, 'utf8');
    const changes  = diff(source.contents, previous, {compare: 'chars'});

    // Map old offsets to new offsets
    let index = 0;
    let offset = 0;
    for(const change of changes){
        while(index < offsets.length && change.rhs.at > offsets[index]){
            mapping.set(offsets[index], offsets[index] + offset);
            index++;
        }
        
        offset = offset + change.lhs.del - change.rhs.add;
    }
    while(index < offsets.length){
        mapping.set(offsets[index], offsets[index] + offset);
        index++;
    }

    // Update fragments with new offsets
    for(const fragment of source.fragments.values()){
        fragment.start = mapping.get(fragment.start)!;
        fragment.end   = mapping.get(fragment.end)!;
    }
}

if(changed){
    console.log(`== File changed new json ==`);

    const json: any = {};
    json.sources = {};
    json.fragments = {};

    for(const source of sources.values()){
        json.sources[source.id] = {
            path: source.path,
            hash: source.hash,
        };
    }

    for(const fragment of fragments.values()){
        json.fragments[fragment.id] = {
            source: fragment.source.id,
            start: fragment.start,
            end: fragment.end,
        };
    }

    console.log(JSON.stringify(json, undefined, 2));
    console.log();
}

// Print out all the fragments
for(const fragment of fragments.values()){
    const source = fragment.source;
    const contents = source.contents.slice(fragment.start, fragment.end);

    console.log(`========================= ${fragment.id}`)
    console.log(contents);
    console.log();
}