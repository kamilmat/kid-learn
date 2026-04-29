import type { ConceptId } from '../../../types'
import type { IntroAnimation } from '../IntroFrame'
import iskierkaCounting5 from './iskierka-counting-5'
import iskierkaCounting10 from './iskierka-counting-10'
import iskierkaSubitizing6 from './iskierka-subitizing-6'
import iskierkaRhythm from './iskierka-rhythm'
import iskierkaAddingConcrete from './iskierka-adding-concrete'
import plomykBonds5 from './plomyk-bonds-5'
import plomykBonds10 from './plomyk-bonds-10'
import plomykTenframe from './plomyk-tenframe'
import plomykAddsub10 from './plomyk-addsub-10'
import plomykFactfamily from './plomyk-factfamily'
import ognikDoubles from './ognik-doubles'
import ognikNeardoubles from './ognik-neardoubles'
import ognikMake10 from './ognik-make10'
import ognikFactfamily20 from './ognik-factfamily-20'
import pochodniaSkipcount2 from './pochodnia-skipcount-2'
import pochodniaSkipcount5 from './pochodnia-skipcount-5'
import pochodniaSkipcount10 from './pochodnia-skipcount-10'
import pochodniaEqualgroups from './pochodnia-equalgroups'
import pochodniaArrays from './pochodnia-arrays'
import pochodniaCommutativity from './pochodnia-commutativity'

export const INTRO_ANIMATIONS: Record<ConceptId, IntroAnimation> = {
  'iskierka-counting-5': iskierkaCounting5 as IntroAnimation,
  'iskierka-counting-10': iskierkaCounting10 as IntroAnimation,
  'iskierka-subitizing-6': iskierkaSubitizing6 as IntroAnimation,
  'iskierka-rhythm': iskierkaRhythm as IntroAnimation,
  'iskierka-adding-concrete': iskierkaAddingConcrete as IntroAnimation,
  'plomyk-bonds-5': plomykBonds5 as IntroAnimation,
  'plomyk-bonds-10': plomykBonds10 as IntroAnimation,
  'plomyk-tenframe': plomykTenframe as IntroAnimation,
  'plomyk-addsub-10': plomykAddsub10 as IntroAnimation,
  'plomyk-factfamily': plomykFactfamily as IntroAnimation,
  'ognik-doubles': ognikDoubles as IntroAnimation,
  'ognik-neardoubles': ognikNeardoubles as IntroAnimation,
  'ognik-make10': ognikMake10 as IntroAnimation,
  'ognik-factfamily-20': ognikFactfamily20 as IntroAnimation,
  'pochodnia-skipcount-2': pochodniaSkipcount2 as IntroAnimation,
  'pochodnia-skipcount-5': pochodniaSkipcount5 as IntroAnimation,
  'pochodnia-skipcount-10': pochodniaSkipcount10 as IntroAnimation,
  'pochodnia-equalgroups': pochodniaEqualgroups as IntroAnimation,
  'pochodnia-arrays': pochodniaArrays as IntroAnimation,
  'pochodnia-commutativity': pochodniaCommutativity as IntroAnimation,
}
