import { Component, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { MovieCardComponent } from './ui/movie-card.component';
import NavComponent from './ui/nav.component';
import { CommonModule } from '@angular/common';
import { MovieDBService } from '../core/services/movie.service';
import { InfiniteScrollComponent } from '../shared/infinit.component';
import { BehaviorSubject, combineLatest } from 'rxjs';
import {
  distinctUntilChanged,
  mergeMap,
  tap,
  startWith,
  debounceTime,
  switchMap,
  map,
} from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MovieCardComponent,
    InfiniteScrollComponent,
    NavComponent,
  ],
  template: `
    <app-nav />
    <section class="movie-section">
      <header>
        <h2 class="section-title">Populer Movies</h2>
        <div class="filter-form">
          <input
            (input)="filterByQuery(query.value)"
            type="text"
            class="search-input"
            #query
            placeholder="Search"
          />
          <!-- <div class="select">
            <select class="select-text" required>
              <option value="" disabled selected></option>
              <option value="1">Option 1</option>
              <option value="2">Option 2</option>
              <option value="3">Option 3</option>
            </select>
            <span class="select-highlight"></span>
            <span class="select-bar"></span>
            <label class="select-label">Select</label>
          </div> -->
          <select
            name="sortby"
            class="sort-select"
            #sort
            (change)="onSortChange(sort.value)"
          >
            <option value="title.desc">Title</option>
            <option value="popularity.desc" selected>Popularity</option>
            <option value="release_date.desc">Release Date</option>
          </select>
        </div>
      </header>
      <div class="divider"></div>
      <infinite-scroll (scrolled)="onScroll()">
        <div class="movie-list">
          <ng-container *ngIf="movieList.length > 0">
            <app-movie-card *ngFor="let movie of movieList" [movie]="movie" />
          </ng-container>
          <!-- <ng-template #notFound> No data found </ng-template> -->
          <ng-container *ngIf="loading">
            <div class="item skeleton" *ngFor="let i of [1, 2, 3, 4]"></div>
          </ng-container>
        </div>
      </infinite-scroll>
    </section>
  `,

  selector: 'app-home',
})
export default class HomeComponent {
  movieService = inject(MovieDBService);
  movieList: any = [];
  pageIndex = 1;
  totalPage = 0;
  filters: {
    paginator$: BehaviorSubject<number>;
    query$: BehaviorSubject<string>;
    sort$: BehaviorSubject<string>;
  } = {
    paginator$: new BehaviorSubject(1),
    query$: new BehaviorSubject(''),
    sort$: new BehaviorSubject('popularity.desc'),
  };
  loading = true;
  constructor() {}

  ngOnInit(): void {
    combineLatest([
      this.filters.paginator$.pipe(startWith(1), distinctUntilChanged()),
      this.filters.query$.pipe(
        startWith(''),
        debounceTime(500),
        distinctUntilChanged(),
        tap((val) => {
          this.filters.paginator$.next(1);
          this.movieList = [];
        })
      ),
      this.filters.sort$.pipe(
        startWith(''),
        distinctUntilChanged(),
        tap((val) => {
          this.filters.paginator$.next(1);
          this.movieList = [];
        })
      ),
    ])
      .pipe(
        distinctUntilChanged(),
        map((data) => {
          this.loading = true;

          return { page: data[0], query: data[1], sort_by: data[2] };
        })
      )
      .subscribe((params) => {
        console.log('movies', params);
        this.movieService.getMovies(params).subscribe((resp) => {
          this.loading = false;
          this.movieList = [...this.movieList, ...resp.results];
          this.totalPage = resp.total_pages;
        });
      });
  }

  /**
   * On select sort
   *
   */
  onSortChange(value: any) {
    this.filters.sort$.next(value);
  }

  /**
   * Load movies on scroll
   *
   */
  onScroll(): void {
    const curPage = this.filters.paginator$.value;
    if (this.loading || this.totalPage == +curPage) return;

    this.filters.paginator$.next(this.filters.paginator$.value + 1);
  }

  /**
   * Filter by search query
   *
   * @param query
   */
  filterByQuery(query: string): void {
    this.filters.query$.next(query);
  }
}
