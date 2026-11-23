import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  forwardRef,
  HostListener,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SearchableSelectOption {
  value: string | number;
  label: string;
  secondary?: string;
  searchText?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './searchable-select.component.html',
  styleUrls: ['./searchable-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
  ],
})
export class SearchableSelectComponent implements ControlValueAccessor, OnChanges {
  @Input() options: SearchableSelectOption[] = [];
  @Input() placeholder = 'Seleccionar';
  @Input() searchPlaceholder = 'Escribe para buscar...';
  @Input() emptyText = 'No se encontraron coincidencias.';
  @Input() clearable = true;
  @Input('disabled') set disabledInput(value: boolean | string) {
    this.setDisabledState(value === true || value === 'true');
  }

  value: string | number | null = null;
  query = '';
  open = false;
  disabled = false;
  activeIndex = -1;

  private onChange: (value: string | number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options']) this.syncLabel();
  }

  get filteredOptions(): SearchableSelectOption[] {
    const term = this.normalize(this.query);
    if (!term || this.selectedOption?.label === this.query) return this.options;
    return this.options.filter(option => this.normalize(
      `${option.label} ${option.secondary ?? ''} ${option.searchText ?? ''}`,
    ).includes(term));
  }

  get selectedOption(): SearchableSelectOption | undefined {
    return this.options.find(option => String(option.value) === String(this.value));
  }

  writeValue(value: string | number | null | undefined): void {
    this.value = value === '' || value === undefined ? null : value;
    this.syncLabel();
  }

  registerOnChange(fn: (value: string | number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
    if (disabled) this.open = false;
  }

  focus(): void {
    if (this.disabled) return;
    this.open = true;
    this.activeIndex = this.indexSeleccionado();
  }

  input(value: string): void {
    this.query = value;
    this.open = true;
    this.activeIndex = this.filteredOptions.length ? 0 : -1;
    if (this.value !== null) {
      this.value = null;
      this.onChange(null);
    }
  }

  select(option: SearchableSelectOption): void {
    if (option.disabled) return;
    this.value = option.value;
    this.query = option.label;
    this.open = false;
    this.activeIndex = -1;
    this.onChange(option.value);
    this.onTouched();
  }

  clear(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled) return;
    this.value = null;
    this.query = '';
    this.open = true;
    this.activeIndex = this.options.length ? 0 : -1;
    this.onChange(null);
    this.onTouched();
  }

  keydown(event: KeyboardEvent): void {
    if (this.disabled) return;
    const options = this.filteredOptions;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.open = true;
      this.activeIndex = Math.min(this.activeIndex + 1, options.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.open = true;
      this.activeIndex = Math.max(this.activeIndex - 1, 0);
    } else if (event.key === 'Enter' && this.open && this.activeIndex >= 0) {
      event.preventDefault();
      const option = options[this.activeIndex];
      if (option) this.select(option);
    } else if (event.key === 'Escape') {
      this.open = false;
      this.restoreLabel();
    }
  }

  optionId(index: number): string {
    return `searchable-option-${index}`;
  }

  trackOption(_: number, option: SearchableSelectOption): string {
    return String(option.value);
  }

  isSelected(option: SearchableSelectOption): boolean {
    return String(option.value) === String(this.value);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.open = false;
      this.restoreLabel();
      this.onTouched();
    }
  }

  private syncLabel(): void {
    if (this.value === null) {
      if (!this.open) this.query = '';
      return;
    }
    const option = this.selectedOption;
    if (option) this.query = option.label;
  }

  private restoreLabel(): void {
    this.query = this.selectedOption?.label ?? '';
  }

  private indexSeleccionado(): number {
    if (this.value === null) return this.options.length ? 0 : -1;
    return this.options.findIndex(option => String(option.value) === String(this.value));
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es')
      .trim();
  }
}
