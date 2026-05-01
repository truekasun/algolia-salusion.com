const IndexFactory = require('@tryghost/algolia-indexer');
const transforms = require('@tryghost/algolia-fragmenter');

exports.handler = async (event) => {
    const {key} = event.queryStringParameters;

    // TODO: Deprecate this in the future and make the key mandatory
    if (key && key !== process.env.NETLIFY_KEY) {
        return {
            statusCode: 401,
            body: `Unauthorized`
        };
    }

    if (process.env.ALGOLIA_ACTIVE !== 'TRUE') {
        return {
            statusCode: 200,
            body: `Algolia is not activated`
        };
    }

    const userAgent = event.headers['user-agent'] || '';
    if (!userAgent.includes('https://github.com/TryGhost/Ghost')) {
        return {
            statusCode: 401,
            body: `Unauthorized`
        };
    }

    const algoliaSettings = {
        appId: process.env.ALGOLIA_APP_ID,
        apiKey: process.env.ALGOLIA_API_KEY,
        index: process.env.ALGOLIA_INDEX
    };

    let {post} = JSON.parse(event.body);

    // Handle both Ghost v4 (object) and v5 (array) payload formats
    let current = post?.current;
    if (Array.isArray(current)) {
        current = current[0];
    }
    post = (current && Object.keys(current).length > 0 && current) || {};

    if (!post || Object.keys(post).length < 1) {
        return {
            statusCode: 200,
            body: `No valid request body detected`
        };
    }

    const node = [];

    // Transformer methods need an Array of Objects
    node.push(post);

    // Transform into Algolia object with the properties we need
    const algoliaObject = transforms.transformToAlgoliaObject(node);

    // Create fragments of the post
    const fragments = algoliaObject.reduce(transforms.fragmentTransformer, []);

    try {
        // Instanciate the Algolia indexer, which connects to Algolia and
        // sets up the settings for the index.
        const index = new IndexFactory(algoliaSettings);
        await index.setSettingsForIndex();
        await index.save(fragments);
        console.log('Fragments successfully saved to Algolia index'); // eslint-disable-line no-console
        return {
            statusCode: 200,
            body: `Post "${post.title}" has been added to the index.`
        };
    } catch (error) {
        console.log(error); // eslint-disable-line no-console
        return {
            statusCode: 500,
            body: JSON.stringify({msg: error.message})
        };
    }
};
