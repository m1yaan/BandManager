import { Router } from 'express';
import {
  getBands, getBandDetails, createBand, updateBand, deleteBand, getBandStats
} from '../controllers/bandsController';
import {
  getSingers, createSinger, updateSinger, deleteSinger
} from '../controllers/singersController';
import {
  getSongs, createSong, updateSong, deleteSong
} from '../controllers/songsController';
import {
  getTours, getTourSongs, createTour, updateTour, deleteTour,
  getTourStops, addTourStop, updateTourStop, deleteTourStop,
  getTourFinances, updateTourFinances,
} from '../controllers/toursController';
import {
  getRider, addRiderItem, updateRiderItem, deleteRiderItem
} from '../controllers/riderController';
import {
  songsByBandTours, bandsByComposer, songInfo,
  topBandRepertoire, toursByBand, songsBySinger
} from '../controllers/reportsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Dashboard
router.get('/bands/stats', getBandStats);

// Bands
router.get('/bands', getBands);
router.get('/bands/:id/details', getBandDetails);
router.post('/bands', createBand);
router.put('/bands/:id', updateBand);
router.delete('/bands/:id', deleteBand);

// Singers
router.get('/singers', getSingers);
router.post('/singers', createSinger);
router.put('/singers/:id', updateSinger);
router.delete('/singers/:id', deleteSinger);

// Songs
router.get('/songs', getSongs);
router.post('/songs', createSong);
router.put('/songs/:id', updateSong);
router.delete('/songs/:id', deleteSong);

// Tours
router.get('/tours', getTours);
router.get('/tours/:id/songs', getTourSongs);
router.post('/tours', createTour);
router.put('/tours/:id', updateTour);
router.delete('/tours/:id', deleteTour);

// Tour stops
router.get('/tours/:id/stops', getTourStops);
router.post('/tours/:id/stops', addTourStop);
router.put('/tours/:id/stops/:stopId', updateTourStop);
router.delete('/tours/:id/stops/:stopId', deleteTourStop);

// Tour finances
router.get('/tours/:id/finances', getTourFinances);
router.put('/tours/:id/finances', updateTourFinances);

// Rider
router.get('/tours/:id/rider', getRider);
router.post('/tours/:id/rider', addRiderItem);
router.put('/rider/:itemId', updateRiderItem);
router.delete('/rider/:itemId', deleteRiderItem);

// Reports
router.get('/reports/songs-by-band-tours', songsByBandTours);
router.get('/reports/bands-by-composer', bandsByComposer);
router.get('/reports/song-info', songInfo);
router.get('/reports/top-band-repertoire', topBandRepertoire);
router.get('/reports/tours-by-band', toursByBand);
router.get('/reports/songs-by-singer', songsBySinger);

export default router;
