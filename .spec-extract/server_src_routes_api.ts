import { Router } from 'express';
import { getBands, getBandDetails, createBand, updateBand, deleteBand, getBandStats } from '../controllers/bandsController';
import { getSingers, createSinger, updateSinger, deleteSinger } from '../controllers/singersController';
import { getSongs, createSong, updateSong, deleteSong } from '../controllers/songsController';
import { getTours, getTourSongs, createTour, updateTour, deleteTour } from '../controllers/toursController';
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

export default router;