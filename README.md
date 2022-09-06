# orbit-summer-2022-demo

This repository contains the implementation of the prototype [mnemonic medium](https://numinous.productions/ttft/) design depicted in [this August 2022 talk](https://www.patreon.com/posts/71081197) and [in this Figma document](https://www.figma.com/file/EeIDP8mQ2fYgEkGhapF5bu/Orbit---Summer-2022-Prototype?node-id=0%3A1). It's for user research purposes only; it's not a production implementation.

## Setup

### Installing the non-free components of this repo
This repository leaves out two important pieces which I do not have the rights to redistribute: the actual content of Shape Up (one of the texts demonstrated in the prototype), and the [Dr font](https://www.productiontype.com/family/dr) used in Orbit.

I have separated Shape Up's content into a [private submodule](https://github.com/andymatuschak/orbit-summer-2022-demo-data-shape-up) available to me and my collaborators. If you have access, you should `git clone --recurse-submodules` or `git submodule init && git submodule update` to put a local copy of Shape Up in the right place.

For your private testing and development purposes, you can [acquire an evaluation copy of the Dr font](https://www.productiontype.com/family/dr) and place it in `src/fonts` at the paths specified by `src/styles/fonts.css`.

### Preparing your local copy

This repo expects you to have [the main Orbit repo](https://github.com/andymatuschak/orbit) checked out as a sibling folder, and fully built. e.g.:
```
# From the root of this repo...
cd ..
git clone https://github.com/andymatuschak/orbit
cd orbit
yarn build
# web-component requires a separate build step; this is an oversight.
cd packages/web-component
yarn build
```

Once you've got that done, the rest of this repo's dependencies can be installed with:

```
yarn install
```

## Development

* To run a local development server: `yarn start`
  * Then visit e.g. http://localhost:3000/shape-up/shapeup/1.1-chapter-02/index.html 
* To run the Storybook UI: `yarn storybook`