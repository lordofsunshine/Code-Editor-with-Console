const selectInstances = new Map();

export function initCustomSelects() {
  document.querySelectorAll('select').forEach(select => {
    if (selectInstances.has(select)) return;
    createCustomSelect(select);
  });
}

window.initCustomSelects = initCustomSelects;
window.createCustomSelect = createCustomSelect;
window.selectInstances = selectInstances;

export function createCustomSelect(selectElement) {
  if (selectInstances.has(selectElement)) {
    return selectInstances.get(selectElement);
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select-wrapper';
  
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'custom-select-button';
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  
  const buttonText = document.createElement('span');
  buttonText.className = 'custom-select-text';
  
  const buttonIcon = document.createElement('svg');
  buttonIcon.className = 'custom-select-icon';
  buttonIcon.setAttribute('viewBox', '0 0 24 24');
  buttonIcon.innerHTML = '<path d="M7 10l5 5 5-5z" fill="currentColor"/>';
  
  button.appendChild(buttonText);
  button.appendChild(buttonIcon);
  
  const dropdown = document.createElement('div');
  dropdown.className = 'custom-select-dropdown';
  dropdown.setAttribute('role', 'listbox');
  
  const options = Array.from(selectElement.options);
  
  if (options.length === 0) {
    buttonText.textContent = 'No files';
  } else {
    options.forEach((option, index) => {
      const optionElement = document.createElement('div');
      optionElement.className = 'custom-select-option';
      optionElement.setAttribute('role', 'option');
      optionElement.setAttribute('data-value', option.value);
      optionElement.textContent = option.text || option.value;
      
      if (option.selected || (index === 0 && !buttonText.textContent)) {
        optionElement.classList.add('selected');
        if (!buttonText.textContent) {
          buttonText.textContent = option.text || option.value;
          selectElement.value = option.value;
        }
      }
      
      optionElement.addEventListener('click', () => {
        selectOption(selectElement, option.value, option.text || option.value, buttonText, dropdown);
      });
      
      dropdown.appendChild(optionElement);
    });
  }
  
  wrapper.appendChild(button);
  wrapper.appendChild(dropdown);
  
  selectElement.style.display = 'none';
  selectElement.parentNode.insertBefore(wrapper, selectElement);
  
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown(button, dropdown);
  });
  
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      closeDropdown(button, dropdown);
    }
  });
  
  const instance = {
    wrapper,
    button,
    dropdown,
    select: selectElement,
    update: () => {
      const selectedOption = options.find(opt => opt.selected);
      if (selectedOption) {
        buttonText.textContent = selectedOption.text;
        dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
          opt.classList.remove('selected');
          if (opt.dataset.value === selectedOption.value) {
            opt.classList.add('selected');
          }
        });
      }
    }
  };
  
  selectInstances.set(selectElement, instance);
  
  selectElement.addEventListener('change', () => {
    instance.update();
  });
  
  return instance;
}

function toggleDropdown(button, dropdown) {
  const isOpen = dropdown.classList.contains('open');
  
  document.querySelectorAll('.custom-select-dropdown').forEach(dd => {
    if (dd !== dropdown) {
      dd.classList.remove('open');
      dd.previousElementSibling.setAttribute('aria-expanded', 'false');
    }
  });
  
  if (isOpen) {
    closeDropdown(button, dropdown);
  } else {
    openDropdown(button, dropdown);
  }
}

function openDropdown(button, dropdown) {
  dropdown.classList.add('open');
  button.setAttribute('aria-expanded', 'true');
  button.classList.add('active');
}

function closeDropdown(button, dropdown) {
  dropdown.classList.remove('open');
  button.setAttribute('aria-expanded', 'false');
  button.classList.remove('active');
}

function selectOption(selectElement, value, text, buttonText, dropdown) {
  selectElement.value = value;
  selectElement.dispatchEvent(new Event('change', { bubbles: true }));
  
  buttonText.textContent = text;
  
  dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
    opt.classList.remove('selected');
    if (opt.dataset.value === value) {
      opt.classList.add('selected');
    }
  });
  
  closeDropdown(dropdown.previousElementSibling, dropdown);
}

export function updateCustomSelect(selectElement) {
  const instance = selectInstances.get(selectElement);
  if (instance) {
    const wrapper = instance.wrapper;
    const button = instance.button;
    const buttonText = button.querySelector('.custom-select-text');
    const dropdown = instance.dropdown;
    
    dropdown.innerHTML = '';
    
    const options = Array.from(selectElement.options);
    
    if (options.length === 0) {
      buttonText.textContent = 'No files';
    } else {
      options.forEach((option) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'custom-select-option';
        optionElement.setAttribute('role', 'option');
        optionElement.setAttribute('data-value', option.value);
        optionElement.textContent = option.text || option.value;
        
        if (option.selected) {
          optionElement.classList.add('selected');
          buttonText.textContent = option.text || option.value;
        }
        
        optionElement.addEventListener('click', () => {
          selectOption(selectElement, option.value, option.text || option.value, buttonText, dropdown);
        });
        
        dropdown.appendChild(optionElement);
      });
      
      if (!buttonText.textContent && options.length > 0) {
        const firstOption = options[0];
        buttonText.textContent = firstOption.text || firstOption.value;
        selectElement.value = firstOption.value;
        dropdown.querySelector('.custom-select-option')?.classList.add('selected');
      }
    }
  }
}

window.updateCustomSelect = updateCustomSelect;

