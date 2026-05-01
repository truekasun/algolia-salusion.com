// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const sinon = require('sinon');

const IndexFactory = require('../');

describe('IndexFactory', function () {
    let sandbox;

    beforeEach(function () {
        sandbox = sinon.createSandbox();
    });

    afterEach(function () {
        sandbox.restore();
    });

    function createMockedAlgoliaIndex(settings) {
        const algoliaIndex = new IndexFactory(settings);

        // In Algolia v5, there is no separate index object — all methods
        // are called directly on the client with indexName as a parameter.
        const mockClient = {
            setSettings: sandbox.stub().resolves(),
            getSettings: sandbox.stub().resolves({some: 'settings'}),
            saveObjects: sandbox.stub().resolves(),
            deleteBy: sandbox.stub().resolves(),
            deleteObjects: sandbox.stub().resolves()
        };

        // Stub initClient to inject our mock client
        sandbox.stub(algoliaIndex, 'initClient').callsFake(function () {
            this.client = mockClient;
        });

        return {algoliaIndex, mockClient};
    }

    it('throws error when settings are not passed', async function () {
        let algoliaIndex;
        try {
            algoliaIndex = new IndexFactory();
        } catch (error) {
            should.exist(error);
            should.not.exist(algoliaIndex);
            error.message.should.eql('Algolia appId, apiKey, and index is required!');
        }
    });

    describe('setSettingsForIndex', function () {
        it('updates settings by default', async function () {
            const {algoliaIndex, mockClient} = createMockedAlgoliaIndex({appId: 'test', apiKey: 'test', index: 'ALGOLIA'});

            const settings = await algoliaIndex.setSettingsForIndex();

            mockClient.setSettings.should.have.been.calledOnce;
            mockClient.setSettings.firstCall.args[0].should.have.property('indexName', 'ALGOLIA');
            mockClient.getSettings.should.have.been.calledOnce;

            should.exist(settings);
        });

        it('does not update Algolia settings when set to false', async function () {
            const {algoliaIndex, mockClient} = createMockedAlgoliaIndex({appId: 'test', apiKey: 'test', index: 'ALGOLIA'});

            const settings = await algoliaIndex.setSettingsForIndex({updateSettings: false});

            mockClient.setSettings.should.have.not.been.called;
            mockClient.getSettings.should.have.been.calledOnce;

            should.exist(settings);
        });

        it('throws AlgoliaError when an error occurs', async function () {
            const {algoliaIndex, mockClient} = createMockedAlgoliaIndex({appId: 'test', apiKey: 'test', index: 'ALGOLIA'});

            mockClient.getSettings.rejects(new Error('Test Error')); // Simulating an error

            try {
                await algoliaIndex.setSettingsForIndex();
            } catch (error) {
                should.exist(error);
                error.errorType.should.eql('AlgoliaError');
            }
        });
    });

    describe('save', function () {
        it('calls saveObjects with indexName and objects', async function () {
            const {algoliaIndex, mockClient} = createMockedAlgoliaIndex({appId: 'test', apiKey: 'test', index: 'ALGOLIA'});
            await algoliaIndex.initIndex();

            const fragments = [{objectID: '1', title: 'Test'}];
            await algoliaIndex.save(fragments);

            mockClient.saveObjects.should.have.been.calledOnce;
            mockClient.saveObjects.firstCall.args[0].should.deepEqual({
                indexName: 'ALGOLIA',
                objects: fragments
            });
        });
    });

    describe('delete', function () {
        it('calls deleteBy with indexName and filters', async function () {
            const {algoliaIndex, mockClient} = createMockedAlgoliaIndex({appId: 'test', apiKey: 'test', index: 'ALGOLIA'});
            await algoliaIndex.initIndex();

            await algoliaIndex.delete('test-slug');

            mockClient.deleteBy.should.have.been.calledOnce;
            mockClient.deleteBy.firstCall.args[0].should.deepEqual({
                indexName: 'ALGOLIA',
                deleteByParams: {filters: 'slug:test-slug'}
            });
        });
    });

    describe('deleteObjects', function () {
        it('calls deleteObjects with indexName and objectIDs', async function () {
            const {algoliaIndex, mockClient} = createMockedAlgoliaIndex({appId: 'test', apiKey: 'test', index: 'ALGOLIA'});
            await algoliaIndex.initIndex();

            const fragments = [{objectID: 'id1'}, {objectID: 'id2'}];
            await algoliaIndex.deleteObjects(fragments);

            mockClient.deleteObjects.should.have.been.calledOnce;
            mockClient.deleteObjects.firstCall.args[0].should.deepEqual({
                indexName: 'ALGOLIA',
                objectIDs: ['id1', 'id2']
            });
        });

        it('handles string objectIDs', async function () {
            const {algoliaIndex, mockClient} = createMockedAlgoliaIndex({appId: 'test', apiKey: 'test', index: 'ALGOLIA'});
            await algoliaIndex.initIndex();

            await algoliaIndex.deleteObjects(['id1', 'id2']);

            mockClient.deleteObjects.firstCall.args[0].objectIDs.should.deepEqual(['id1', 'id2']);
        });
    });
});
