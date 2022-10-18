require('dotenv').config();
const axios = require('axios');
const { API_KEY } = process.env;
const { Videogame, Genre } = require('../db.js');
const { Op } = require('sequelize');

async function getAllVideoGames() {
  try {
    //peticion a la api
    let NumPage = 5;
    let ApiInfo = [];

    for (let i = 1; i <= NumPage; i++) {
      ApiInfo = [
        ...ApiInfo,
        `https://api.rawg.io/api/games?key=${API_KEY}&page=${i}`,
      ];
    }

    ApiInfo = ApiInfo.map((e) => axios.get(e));
    ApiInfo = await axios.all(ApiInfo);
    ApiInfo = ApiInfo.map((e) => e.data.results).flat(1);

    //mapeo datos de la api
    ApiInfo = ApiInfo?.map((e) => ({
      id: e.id,
      name: e.name,
      // description: null,
      released: e.released,
      rating: e.rating,
      platforms: e.platforms.map((e) => e.platform.name),
      genres: e.genres.map((e) => e.name),
      background_image: e.background_image,
      created: false,
    }));

    //busco la info en la DB
    let DBInfo = await Videogame.findAll({
      include: {
        model: Genre,
        attributes: ['name'],
        through: { attributes: [] },
      },
    });

    //mapeo la indo de la DB
    DBInfo = DBInfo.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      released: e.released,
      rating: e.rating,
      platforms: e.platforms,
      // platforms: e.platforms ? e.platforms.map((e) => e.platform.name) : null,
      genres: e.genres?.map((e) => e.name),
      background_image: e.image,
    }));

    //uno datos de la api y DB
    return ApiInfo.concat(DBInfo);
  } catch (error) {
    return error;
  }
}

async function getVideoGameName(name) {
  try {
    //busco en la db
    let DBInfo = await Videogame.findAll({
      where: {
        name: { [Op.iLike]: `%${name}%` },
      },
      include: {
        model: Genre,
        attributes: ['name'],
        through: { attributes: [] },
      },
    });

    //mapeo la indo de la DB
    DBInfo = DBInfo.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      released: e.released,
      rating: e.rating,
      platforms: e.platforms,
      // platforms: e.platforms ? e.platforms.map((e) => e.platform.name) : null,
      genres: e.genres?.map((e) => e.name),
      background_image: e.image,
    }));

    //busco en la api
    let ApiInfo = await axios.get(
      `https://api.rawg.io/api/games?key=${API_KEY}&&search=${name}`
    );

    //mapeo los datos de la api, si tengo algun dato en la db, recorto el array de la api segun el length de la DB y concateno la DBinfo a la ApiInfo
    ApiInfo = ApiInfo.data.results
      .slice(0, 15 - DBInfo.length)
      .map((e) => {
        return {
          id: e.id,
          name: e.name,
          // description: e.description,
          released: e.released,
          rating: e.rating,
          platforms: e.platforms.map((e) => e.platform.name),
          genres: e.genres.map((e) => e.name),
          background_image: e.background_image,
          created: false,
        };
      })
      .concat(DBInfo);

    return ApiInfo.length ? ApiInfo : `${name} no existe.`;
  } catch (error) {
    return error;
  }
}

async function getVideoGameId(id) {
  try {
    //busco en la db primero
    if (id.length > 15) {
      let DBInfo = await Videogame.findOne({
        //falta hacer el join con genre
        where: { id },
        include: {
          model: Genre,
          attributes: ['name'],
          through: { attributes: [] },
        },
      });

      if (DBInfo)
        return (DBInfo = {
          id: DBInfo.id,
          name: DBInfo.name,
          description: DBInfo.description,
          released: DBInfo.released,
          rating: DBInfo.rating,
          platforms: DBInfo.platforms,
          genres: DBInfo.genres?.map((e) => e.name),
          background_image: DBInfo.image,
        });
      return 'ID invalido.';
    } else {
      //busco en la api
      let ApiInfo = await axios.get(
        `https://api.rawg.io/api/games/${id}?key=${API_KEY}`
      );
      ApiInfo = ApiInfo.data;
      return {
        name: ApiInfo.name,
        description: ApiInfo.description,
        released: ApiInfo.released,
        rating: ApiInfo.rating,
        platforms: ApiInfo.platforms.map((e) => e.platform.name),
        background_image: ApiInfo.background_image,
        created: false,
      };
    }
  } catch (error) {
    // console.log(error);
    return error;
  }
}

async function createVideoGame(
  name,
  description,
  released,
  rating,
  platforms,
  genres,
  image
) {
  if (!name) return `Debe ingresar un nombre.`;
  try {
    let game = await Videogame.create({
      name,
      description,
      released,
      rating,
      platforms,
      genres,
      image: image
        ? image
        : `https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSch19yXTth6yL5J-SU6FafjJAUv1C1ptwziIyqk_3Skw&s`,
    });

    // let listGenres = await Promise.all(
    //   genres.map((e) => Genre.findOne({ where: { name: e } }))
    // );
    // game.addGenre(listGenres);

    //preguntar esto
    //Genre con s al final?
    // let listGenres = await Genre.findAll({ where: { name: genres } });
    // game.addGenre(listGenres);
    return `${name} creado con exito.`;
  } catch (error) {
    console.log(error);
    return error;
  }
}

async function getGenres() {
  try {
    //Verifico si existe algo en DB.
    let DBinfo = await Genre.findAll();
    if (DBinfo.length) return DBinfo;
    //Si no hay nada, traigo de la api
    else {
      let ApiInfo = await axios.get(
        `https://api.rawg.io/api/genres?key=${API_KEY}`
      );
      ApiInfo = ApiInfo.data.results
        .map((e) => {
          return { id: e.id, name: e.name };
        })
        .sort((a, b) => a.id - b.id);
      //creo en la DB
      await Genre.bulkCreate(ApiInfo);
      return ApiInfo;
    }
  } catch (error) {
    return error;
  }
}
module.exports = {
  getAllVideoGames,
  getVideoGameName,
  getVideoGameId,
  createVideoGame,
  getGenres,
};
