/**
 * Copyright © 2014 sequelize-slugify
 * All Rights Reserved.
 */

'use strict';

var Sequelize = require('sequelize');

var dbUsername = process.env.DB_USER || 'postgres';
var dbPassword = process.env.DB_PW || null;
var sequelize = new Sequelize('sequelize_slugify_test', dbUsername, dbPassword, {
    host: 'localhost',
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: false,
});

var SequelizeSlugify = require('../index');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;

var GetUser = function(modelname) {
    return sequelize.define(modelname, {
        slug: {
            type: Sequelize.STRING,
            unique: true
        },
        alternateSlug: {
            type: Sequelize.STRING,
            unique: true
        },
        givenName: {
            type: Sequelize.STRING,
            allowNull: false
        },
        familyName: {
            type: Sequelize.STRING,
            allowNull: false
        },
        nickName: {
            type: Sequelize.STRING,
            allowNull: true
        },
        age: {
            type: Sequelize.INTEGER,
            allowNull: true
        }
    });
};

var User = {};
var userId = 0;

describe('sequelize-slugify', function () {

    describe('slugs', function () {

        // user a new model for each test
        beforeEach(function () {
            User = GetUser('user' + userId);
            userId++;
            return sequelize.sync({ force: true });
        });

        it('should create a slug from a single field', function () {
            SequelizeSlugify.slugifyModel(User, {
                source: ['givenName']
            });

            return User.create({
                givenName: 'Suzan',
                familyName: 'Scheiber'
            }).then(function (user) {
                return expect(user.slug).to.equal('suzan');
            });
        });


      it('should create a slug from multiple fields', function () {
            SequelizeSlugify.slugifyModel(User, {
                source: ['givenName', 'familyName']
            });

            return User.create({
                givenName: 'Ernesto',
                familyName: 'Elsass'
            }).then(function (user) {
                return expect(user.slug).to.equal('ernesto-elsass');
            });
        });

        describe('bulk operations', function() {
          xit('should bulk update a slug from the Model', function () {
            SequelizeSlugify.slugifyModel(User, {
              source: ['givenName']
            });

            return User.create({
              givenName: 'Woibrert',
              familyName: 'Hamazoni'
            }).then(function() {
              return User.update({
                givenName: 'Hazzah'
              }, {where: {givenName: 'Woibrert'}})
            }).then(function() {
              return User.findOne({givenName: 'Hazzah'})
            }).then(function (user) {
              return expect(user.slug).to.equal('hazzah');
            });
          });

          it('should create a slug during a bulk create', function () {
            SequelizeSlugify.slugifyModel(User, {
              source: ['givenName']
            });

            return User.bulkCreate([
              {givenName: 'Groyta', familyName: 'Helmerson'},
              {givenName: 'Weelan', familyName: 'Rolshier'}
            ]).then(function (user) {
              expect(user[0].slug).to.equal('groyta');
              expect(user[1].slug).to.equal('weelan');
            });
          });
        });

        describe('source suffixes', function () {
            it('should use provided slug suffixes if the slug already exists', function () {
                SequelizeSlugify.slugifyModel(User, {
                    source: ['givenName', 'familyName'],
                    suffixSource: ['nickName']
                });

                return User.create({
                    givenName: 'Cleora',
                    familyName: 'Curley'
                }).then(function () {
                    return User.create({
                        givenName: 'Cleora',
                        familyName: 'Curley',
                        nickName: 'Cleo'
                    });
                }).then(function(user) {
                    return expect(user.slug).to.equal('cleora-curley-cleo');
                });
            });

            it('should handle multiple slug suffix fields', function () {
                SequelizeSlugify.slugifyModel(User, {
                    source: ['givenName', 'familyName'],
                    suffixSource: ['nickName', 'age']
                });

                return User.create({
                    givenName: 'Donald',
                    familyName: 'Draper'
                }).then(function () {
                    return User.create({
                        givenName: 'Donald',
                        familyName: 'Draper',
                        nickName: 'Don'
                    });
                }).then(function () {
                    return User.create({
                        givenName: 'Donald',
                        familyName: 'Draper',
                        nickName: 'Don',
                        age: 42
                    });
                }).then(function(user) {
                    return expect(user.slug).to.equal('donald-draper-don-42');
                });
            });

            it('should fall back on numeric suffixes', function() {
                SequelizeSlugify.slugifyModel(User, {
                    source: ['givenName', 'familyName'],
                    suffixSource: ['nickName', 'age']
                });

                return User.create({
                    givenName: 'Gary',
                    familyName: 'Gray',
                    nickName: 'Gutsy'
                }).then(function () {
                    return User.create({
                        givenName: 'Gary',
                        familyName: 'Gray',
                        nickName: 'Gutsy'
                    });
                }).then(function () {
                    return User.create({
                        givenName: 'Gary',
                        familyName: 'Gray',
                        nickName: 'Gutsy'
                    });
                }).then(function () {
                    return User.create({
                        givenName: 'Gary',
                        familyName: 'Gray',
                        nickName: 'Gutsy'
                    });
                }).then(function(user) {
                    return expect(user.slug).to.equal('gary-gray-gutsy-2');
                });
            });
        });

        it('should increment slug suffix if it already exists', function () {
            SequelizeSlugify.slugifyModel(User, {
                source: ['givenName', 'familyName']
            });

            return User.create({
                givenName: 'Cleora',
                familyName: 'Curley'
            }).then(function () {
                return User.create({
                    givenName: 'Cleora',
                    familyName: 'Curley'
                });
            }).then(function(user) {
                return expect(user.slug).to.equal('cleora-curley-1');
            });
        });

        it('should overwrite slug by default', function () {
            SequelizeSlugify.slugifyModel(User, {
                source: ['givenName']
            });

            return User.create({
                givenName: 'Rupert',
                familyName: 'Rinaldi'
            }).then(function (user) {
                user.givenName = 'Genie';
                user.familyName = 'Gayden';

                return user.save();
            }).then(function(updatedUser) {
                return expect(updatedUser.slug).to.equal('genie');
            });
        });

        it('should NOT overwrite slug if option says not to', function () {
            SequelizeSlugify.slugifyModel(User, {
                source: ['givenName'],
                overwrite: false
            });

            return User.create({
                givenName: 'Miquel',
                familyName: 'Mceachin'
            }).then(function (user) {
                user.givenName = 'Sallie';
                user.familyName = 'Shira';

                return user.save();
            }).then(function(updatedUser) {
                return expect(updatedUser.slug).to.equal('miquel');
            });
        });


        it('should create a slug using custom slug field', function () {
            SequelizeSlugify.slugifyModel(User, {
                source: ['givenName'],
                column: 'alternateSlug'
            });

            return User.create({
                givenName: 'Brobar',
                familyName: 'Handlemart'
            }).then(function (user) {
                return expect(user.alternateSlug).to.equal('brobar');
            });
        });

        it('should pass slug options to slug module', function () {
            SequelizeSlugify.slugifyModel(User, {
                source: ['givenName'],
                slugOptions: {
                    replacement: '#',
                    lower: false
                }
            });

            return User.create({
                givenName: 'Here There',
                familyName: 'Justified'
            }).then(function (user) {
                return expect(user.slug).to.equal('Here#There');
            });
        });

        it('should replace the incremental separator if replacement slug option is specified', function() {
            SequelizeSlugify.slugifyModel(User, {
                source: ['givenName', 'familyName'],
                slugOptions: {
                    incrementalReplacement: '+',
                    lower: true
                }
            });

            return User.create({
                givenName: 'Cleora',
                familyName: 'Curley'
            }).then(function () {
                return User.create({
                    givenName: 'Cleora',
                    familyName: 'Curley'
                });
            }).then(function(user) {
                return expect(user.slug).to.equal('cleora-curley+1');
            });
        });

        it('should use the default incremental separator if no replacement slug option is specified', function() {
            SequelizeSlugify.slugifyModel(User, {
                source: ['givenName', 'familyName'],
                slugOptions: {
                    lower: true
                }
            });

            return User.create({
                givenName: 'Cleora',
                familyName: 'Curley'
            }).then(function () {
                return User.create({
                    givenName: 'Cleora',
                    familyName: 'Curley'
                });
            }).then(function(user) {
                return expect(user.slug).to.equal('cleora-curley-1');
            });
        });


        it('should return null if it fails to slugify the source', function() {
            SequelizeSlugify.slugifyModel(User, {
                source: ['givenName', 'familyName'],
                slugOptions: {
                    lower: true
                }
            });

            return User.create({
                givenName: '你好我的名字是',
                familyName: '你好我的名字是'
            }).then(function (user) {
                return expect(user.slug).to.equal(null);
            });
        });

        describe("manual updating", function(){
            it('should be able to update slug manually', async () => {
                SequelizeSlugify.slugifyModel(User, {
                    source: ['nickName'],
                    overwrite: false
                });
    
                const user = await User.create({
                    givenName: 'Suzan',
                    familyName: 'Scheiber',
                    nickName: 'Cleo'
                });

                expect(user.slug).to.be.equal('cleo');

                user.nickName = 'Don';
                
                await user.updateSlug();
                
                expect(user.slug).to.be.equal('don');
            });
        });
    });

    after(function () {
        return sequelize.close();
    });
});
